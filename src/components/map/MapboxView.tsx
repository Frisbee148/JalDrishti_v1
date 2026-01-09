"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapboxViewProps {
    rainfallIntensity: number;
}

// Ensure token is set
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Custom marker HTML for pulsar effect
const createPulsingMarker = (type: string) => {
    const el = document.createElement('div');
    el.className = type === 'citizen_report' ? 'marker-pulse-amber' : 'marker-pulse';
    return el;
};

// Data assets
const WARDS_DATA_URL = "/data/delhi-wards.geojson";
const HOTSPOTS_DATA_URL = "/data/hotspots.json";
const BASIN_FILES = [
    "/data/delhi_drains/najafgarh_basin.json",
    "/data/delhi_drains/barapullah_basin.json",
    "/data/delhi_drains/shadara_yamuna_basin.json"
];

// Max rainfall for slider (mm/hr)
const MAX_RAINFALL = 120;

export function MapboxView({ rainfallIntensity }: MapboxViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const popup = useRef<mapboxgl.Popup | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        if (!MAPBOX_TOKEN) {
            console.error("Mapbox token is missing");
            return;
        }

        mapboxgl.accessToken = MAPBOX_TOKEN;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/standard", // Standard style for 3D buildings
            center: [77.2090, 28.6139], // Delhi center
            zoom: 12,
            pitch: 60,
            bearing: -20,
            antialias: true,
        });

        // Create reusable popup
        popup.current = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: false,
            className: 'ward-popup'
        });

        map.current.on("load", () => {
            if (!map.current) return;
            const m = map.current;

            m.resize();
            setMapLoaded(true);

            // 1. Add 3D Terrain
            m.addSource("mapbox-dem", {
                type: "raster-dem",
                url: "mapbox://mapbox.mapbox-terrain-dem-v1",
                tileSize: 512,
                maxzoom: 14,
            });
            m.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

            // 2. Load Wards Data Source
            m.addSource("delhi-wards", {
                type: "geojson",
                data: WARDS_DATA_URL,
            });

            // 3. Ward Risk Layer (fill-extrusion) - THE WATER VOLUME
            // This is placed FIRST so buildings render ON TOP of it
            m.addLayer({
                id: "delhi-wards-risk",
                type: "fill-extrusion",
                source: "delhi-wards",
                paint: {
                    "fill-extrusion-color": "#c084fc", // Start at purple (safe)
                    "fill-extrusion-height": 0,        // Start flat
                    "fill-extrusion-base": 0,
                    "fill-extrusion-opacity": 0.6,     // Semi-transparent "water" look
                    // Smooth transitions
                    "fill-extrusion-height-transition": { duration: 300, delay: 0 },
                    "fill-extrusion-color-transition": { duration: 300, delay: 0 },
                },
            });

            // 4. 3D Buildings Layer - (Handled natively by 'standard' style)
            // We do not need to manually add it.


            // 5. Ward Outline Layer - For boundary visibility
            m.addLayer({
                id: "ward-outline",
                type: "line",
                source: "delhi-wards",
                paint: {
                    "line-color": "#6200EA",
                    "line-width": 1.5,
                    "line-opacity": 0.8,
                },
            });

            // 6. Load Drains Basins (Lines)
            BASIN_FILES.forEach((file, index) => {
                const sourceId = `basin-${index}`;
                m.addSource(sourceId, { type: "geojson", data: file });

                m.addLayer({
                    id: `drain-lines-${index}`,
                    type: "line",
                    source: sourceId,
                    layout: { "line-join": "round", "line-cap": "round" },
                    paint: {
                        "line-color": "#00f2ff",
                        "line-width": 2,
                        "line-blur": 0.5,
                        "line-opacity": 0.9,
                    },
                });

                m.addLayer({
                    id: `drain-glow-${index}`,
                    type: "line",
                    source: sourceId,
                    layout: { "line-join": "round" },
                    paint: {
                        "line-color": "#00f2ff",
                        "line-width": 8,
                        "line-blur": 4,
                        "line-opacity": 0.4,
                    },
                });
            });

            // 7. Load Hotspots (Custom Markers)
            fetch(HOTSPOTS_DATA_URL)
                .then(res => res.json())
                .then(data => {
                    if (data && data.features) {
                        data.features.forEach((feature: any) => {
                            const type = feature.properties.type || 'chronic';
                            const el = createPulsingMarker(type);
                            const isVerified = feature.properties.verified_by_ai;
                            const badgeHtml = isVerified
                                ? `<span style="background:#0ea5e9; color:white; font-size:9px; padding:2px 4px; border-radius:4px; margin-bottom:4px; display:inline-block;">Verified AI</span>`
                                : '';

                            const markerPopup = new mapboxgl.Popup({ offset: 25 })
                                .setHTML(`
                                    <div style="color:black; padding:5px;">
                                        ${badgeHtml}
                                        <h3 style="font-weight:bold;">${feature.properties.name}</h3>
                                        <p>${feature.properties.description}</p>
                                        <span style="font-size:10px; color: grey;">${feature.properties.basin}</span>
                                    </div>
                                `);

                            new mapboxgl.Marker({ element: el })
                                .setLngLat(feature.geometry.coordinates)
                                .setPopup(markerPopup)
                                .addTo(m);
                        });
                    }
                })
                .catch(err => console.error("Failed to load hotspots", err));

            // 8. Ward Click Handler - Live PSI Calculation
            m.on('click', 'delhi-wards-risk', (e) => {
                if (!e.features || e.features.length === 0) return;
                const feature = e.features[0];
                const props = feature.properties || {};

                // Get ward name
                const wardName = props.Ward_Name || props.name || props.NAME || `Ward ${props.Ward_No || 'Unknown'}`;

                // Calculate vulnerability_score from Shape_Area (1-10 scale)
                const shapeArea = props.Shape_Area || 0.01;
                const vulnerabilityScore = Math.min(10, Math.max(1, Math.round(10 * shapeArea / 0.05)));

                // Get current rainfall from window
                const currentRainfall = (window as any).__currentRainfallIntensity || 0;

                // Live PSI: (vulnerability_score * (rainfall / MAX_RAINFALL) * 10)
                const livePSI = (vulnerabilityScore * (currentRainfall / MAX_RAINFALL) * 10).toFixed(1);

                // Determine risk level
                const psiNum = parseFloat(livePSI);
                let riskLevel = "Safe";
                let riskColor = "#22c55e";
                if (psiNum > 7) {
                    riskLevel = "Critical";
                    riskColor = "#ef4444";
                } else if (psiNum > 5) {
                    riskLevel = "High";
                    riskColor = "#f59e0b";
                } else if (psiNum > 3) {
                    riskLevel = "Moderate";
                    riskColor = "#eab308";
                }

                popup.current?.setLngLat(e.lngLat)
                    .setHTML(`
                        <div style="padding: 12px; min-width: 220px; font-family: system-ui;">
                            <h4 style="font-weight: bold; font-size: 16px; margin: 0 0 12px 0; color: #1e293b;">${wardName}</h4>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #64748b;">Vulnerability:</span>
                                <span style="font-weight: 600; color: #6200EA;">${vulnerabilityScore}/10</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #64748b;">Rainfall:</span>
                                <span style="font-weight: 600;">${currentRainfall} mm/hr</span>
                            </div>
                            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 10px 0;"/>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #64748b;">Live Severity Index:</span>
                                <span style="font-weight: bold; font-size: 20px; color: ${riskColor};">${livePSI}/10</span>
                            </div>
                            <div style="margin-top: 10px; padding: 8px; background: ${riskColor}15; border-radius: 6px; text-align: center; border: 1px solid ${riskColor}40;">
                                <span style="color: ${riskColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${riskLevel}</span>
                            </div>
                        </div>
                    `)
                    .addTo(m);
            });

            // Change cursor on hover
            m.on('mouseenter', 'delhi-wards-risk', () => {
                m.getCanvas().style.cursor = 'pointer';
            });
            m.on('mouseleave', 'delhi-wards-risk', () => {
                m.getCanvas().style.cursor = '';
            });
        });

        // Resize handler
        const handleResize = () => map.current?.resize();
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update ward risk layer based on Rainfall Intensity
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        const m = map.current;

        // Store current rainfall for popup access
        (window as any).__currentRainfallIntensity = rainfallIntensity;

        if (!m.getLayer("delhi-wards-risk")) return;

        // 1. Dynamic Height: vulnerability_score * rainfall * 2
        // vulnerability_score is derived from Shape_Area (1-10)
        const waterHeight: mapboxgl.Expression = [
            "*",
            ["min", 10, ["max", 1, ["round", ["*", 10, ["/", ["get", "Shape_Area"], 0.05]]]]],
            rainfallIntensity * 15 // Increased from 2 to 15 for better visual height
        ];
        m.setPaintProperty("delhi-wards-risk", "fill-extrusion-height", waterHeight);

        // 2. Color Morphing: Purple (Safe) -> Yellow (Warning) -> Red (Critical)
        // Use rainfall intensity directly in the expression
        const intensityFactor = rainfallIntensity / MAX_RAINFALL; // 0 to 1

        const riskColor: mapboxgl.Expression = [
            "interpolate",
            ["linear"],
            ["literal", intensityFactor],
            0, "#c084fc",     // Purple (Safe)
            0.3, "#a855f7",   // Darker Purple
            0.5, "#facc15",   // Yellow (Warning)
            0.75, "#f97316",  // Orange
            1.0, "#ef4444"    // Red (Critical)
        ];
        m.setPaintProperty("delhi-wards-risk", "fill-extrusion-color", riskColor);

        // 3. Opacity Control: 0 at start (invisible) -> 0.6 max
        // This ensures "dry state" looks like a normal map
        const opacityExpression: mapboxgl.Expression = [
            "interpolate",
            ["linear"],
            ["literal", intensityFactor],
            0, 0,      // Invisible at 0
            0.1, 0.4,  // Quickly becomes visible
            1.0, 0.6   // Max opacity
        ];
        m.setPaintProperty("delhi-wards-risk", "fill-extrusion-opacity", opacityExpression);

    }, [rainfallIntensity, mapLoaded]);

    return (
        <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-background" />
    );
}
