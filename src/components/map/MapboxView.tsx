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

// Helper: Calculate vulnerability score from Shape_Area (1-10)
const getVulnerabilityExpression = (): mapboxgl.Expression => [
    "min",
    10,
    ["max", 1, ["round", ["*", 10, ["/", ["get", "Shape_Area"], 0.05]]]]
];

// Helper: Calculate risk score based on vulnerability and rainfall
const calculateRiskScore = (vulnerability: number, rainfallIntensity: number): number => {
    return Math.round((vulnerability * rainfallIntensity) / 10);
};

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
            style: "mapbox://styles/mapbox/light-v11",
            center: [77.1025, 28.7041], // Delhi center
            zoom: 10.5,
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

            // Add Fog (Atmosphere) - Peach theme
            m.setFog({
                "range": [0.5, 10],
                "color": "#ffdfba",
                "horizon-blend": 0.3,
                "high-color": "#ffadad",
                "space-color": "#4a2c2a",
                "star-intensity": 0.6
            });

            // Find label layer for proper stacking
            const layers = m.getStyle().layers;
            const labelLayerId = layers?.find(
                (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
            )?.id;

            // 2. Load Wards Data Source
            m.addSource("delhi-wards", {
                type: "geojson",
                data: WARDS_DATA_URL,
            });

            // 3. Ward Base Layer (fill) - Always visible, shows ward boundaries
            m.addLayer({
                id: "ward-base",
                type: "fill",
                source: "delhi-wards",
                paint: {
                    "fill-color": "#e9d5ff", // Light Purple (safe state)
                    "fill-opacity": 0.7,
                },
            });

            // 4. Ward Outline Layer - Better visibility
            m.addLayer({
                id: "ward-outline",
                type: "line",
                source: "delhi-wards",
                paint: {
                    "line-color": "#7c3aed",
                    "line-width": 1,
                    "line-opacity": 0.8,
                },
            });

            // 5. Water Fill-Extrusion Layer - Blue water that "rises" with rainfall
            m.addLayer({
                id: "ward-water",
                type: "fill-extrusion",
                source: "delhi-wards",
                paint: {
                    "fill-extrusion-color": "#3b82f6", // Blue water color
                    "fill-extrusion-height": 0, // Starts at 0, grows with rainfall
                    "fill-extrusion-base": 0,
                    "fill-extrusion-opacity": 0, // Start invisible
                    // Transitions for smooth animation
                    "fill-extrusion-height-transition": { duration: 500, delay: 0 },
                    "fill-extrusion-opacity-transition": { duration: 300, delay: 0 },
                    "fill-extrusion-color-transition": { duration: 300, delay: 0 },
                },
            }, labelLayerId);

            // 6. 3D Buildings Layer
            m.addLayer(
                {
                    'id': '3d-buildings',
                    'source': 'composite',
                    'source-layer': 'building',
                    'filter': ['==', 'extrude', 'true'],
                    'type': 'fill-extrusion',
                    'minzoom': 13,
                    'paint': {
                        'fill-extrusion-color': '#a78bfa', // Lighter purple for buildings
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': ['get', 'min_height'],
                        'fill-extrusion-opacity': 0.7
                    }
                },
                labelLayerId
            );

            // 7. Load Drains Basins (Lines)
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

            // 8. Load Hotspots (Custom Markers)
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

            // 9. Ward Click Handler for Popup
            m.on('click', 'ward-base', (e) => {
                if (!e.features || e.features.length === 0) return;
                const feature = e.features[0];
                const props = feature.properties || {};

                // Get ward name (try multiple property names)
                const wardName = props.Ward_Name || props.name || props.NAME || `Ward ${props.Ward_No || 'Unknown'}`;

                // Calculate vulnerability from Shape_Area
                const shapeArea = props.Shape_Area || 0.01;
                const vulnerability = Math.min(10, Math.max(1, Math.round(10 * shapeArea / 0.05)));

                // Get current rainfall from component state (we'll update this in the effect)
                const currentRainfall = (window as any).__currentRainfallIntensity || 0;
                const riskScore = calculateRiskScore(vulnerability, currentRainfall);

                // Determine risk level
                let riskLevel = "Low";
                let riskColor = "#22c55e"; // green
                if (riskScore > 70) {
                    riskLevel = "Critical";
                    riskColor = "#ef4444"; // red
                } else if (riskScore > 40) {
                    riskLevel = "High";
                    riskColor = "#f59e0b"; // amber
                } else if (riskScore > 20) {
                    riskLevel = "Moderate";
                    riskColor = "#eab308"; // yellow
                }

                popup.current?.setLngLat(e.lngLat)
                    .setHTML(`
                        <div style="padding: 12px; min-width: 200px;">
                            <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px; color: #1e293b;">${wardName}</h3>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="color: #64748b;">Vulnerability:</span>
                                <span style="font-weight: 600; color: #7c3aed;">${vulnerability}/10</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                                <span style="color: #64748b;">Current Rainfall:</span>
                                <span style="font-weight: 600;">${currentRainfall} mm/hr</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #64748b;">Risk Score:</span>
                                <span style="font-weight: bold; font-size: 18px; color: ${riskColor};">${riskScore}</span>
                            </div>
                            <div style="margin-top: 8px; padding: 6px 12px; background: ${riskColor}20; border-radius: 4px; text-align: center;">
                                <span style="color: ${riskColor}; font-weight: 600;">${riskLevel} Risk</span>
                            </div>
                        </div>
                    `)
                    .addTo(m);
            });

            // Change cursor on hover
            m.on('mouseenter', 'ward-base', () => {
                m.getCanvas().style.cursor = 'pointer';
            });
            m.on('mouseleave', 'ward-base', () => {
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

    // Update layers based on Rainfall Intensity
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        const m = map.current;

        // Store current rainfall for popup access
        (window as any).__currentRainfallIntensity = rainfallIntensity;

        if (!m.getLayer("ward-base") || !m.getLayer("ward-water")) return;

        const intensityFactor = rainfallIntensity / 100; // 0 to 1

        // 1. Update Ward Base Color (Purple -> Amber -> Red based on intensity)
        const wardColor: mapboxgl.Expression = [
            "interpolate",
            ["linear"],
            ["literal", intensityFactor],
            0, "#e9d5ff",     // Light Purple (safe)
            0.3, "#c084fc",   // Medium Purple
            0.5, "#f59e0b",   // Amber (warning)
            0.8, "#f97316",   // Orange
            1.0, "#ef4444"    // Red (critical)
        ];
        m.setPaintProperty("ward-base", "fill-color", wardColor);
        m.setPaintProperty("ward-base", "fill-opacity", 0.5 + (intensityFactor * 0.4));

        // 2. Handle Water Extrusion - EXPLICIT ZERO when no rainfall
        if (rainfallIntensity === 0) {
            // Completely hide water at zero rainfall
            m.setPaintProperty("ward-water", "fill-extrusion-height", 0);
            m.setPaintProperty("ward-water", "fill-extrusion-opacity", 0);
        } else {
            // Calculate water height based on vulnerability × rainfall
            // Height expression: vulnerability_score (derived from Shape_Area) × rainfall × multiplier
            const waterHeight: mapboxgl.Expression = [
                "*",
                ["min", 10, ["max", 1, ["round", ["*", 10, ["/", ["get", "Shape_Area"], 0.05]]]]],
                intensityFactor * 50 // Max height ~500m at full intensity for max vulnerability
            ];
            m.setPaintProperty("ward-water", "fill-extrusion-height", waterHeight);

            // Water color transitions from light blue to deep blue
            const waterColor: mapboxgl.Expression = [
                "interpolate",
                ["linear"],
                ["literal", intensityFactor],
                0, "#93c5fd",     // Light Blue
                0.5, "#3b82f6",   // Blue
                1.0, "#1d4ed8"    // Deep Blue
            ];
            m.setPaintProperty("ward-water", "fill-extrusion-color", waterColor);

            // Keep opacity low for translucency (buildings visible through water)
            // Max opacity 0.4 to ensure buildings are visible
            m.setPaintProperty("ward-water", "fill-extrusion-opacity", Math.min(0.4, 0.15 + (intensityFactor * 0.25)));
        }

    }, [rainfallIntensity, mapLoaded]);

    return (
        <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-background" />
    );
}
