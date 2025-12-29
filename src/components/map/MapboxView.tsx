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
// We will load basin files dynamically or hardcode the list
const BASIN_FILES = [
    "/data/delhi_drains/najafgarh_basin.json",
    "/data/delhi_drains/barapullah_basin.json",
    "/data/delhi_drains/shadara_yamuna_basin.json"
];

export function MapboxView({ rainfallIntensity }: MapboxViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
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
            style: "mapbox://styles/mapbox/dark-v11",
            center: [77.1025, 28.7041], // Delhi center
            zoom: 10.5,
            pitch: 60, // [FIX] Updated per checklist
            bearing: -20, // [FIX] Updated per checklist
            antialias: true,
        });

        map.current.on("load", () => {
            if (!map.current) return;
            const m = map.current; // access current ref

            // [FIX] Force resize to ensure tiles render
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

            // Add Fog (Atmosphere) for that "Royal" depth - Initial Static
            m.setFog({
                "range": [0.5, 10],
                "color": "#1a1033", // Background purple
                "horizon-blend": 0.3,
                "high-color": "#2d1b4d", // Surface purple
                "space-color": "#0b0c15",
                "star-intensity": 0.6
            });

            // [FIX] Add 3D Building Extrusions (Standard Mapbox Buildings)
            // Insert after known labels if possible, or just add.
            // Finding the first symbol layer to place buildings below labels is a nice touch, but optional.
            // We'll just add it to the stack.
            const layers = m.getStyle().layers;
            const labelLayerId = layers?.find(
                (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
            )?.id;

            m.addLayer(
                {
                    'id': '3d-buildings',
                    'source': 'composite',
                    'source-layer': 'building',
                    'filter': ['==', 'extrude', 'true'],
                    'type': 'fill-extrusion',
                    'minzoom': 13, // Buildings usually better at higher zoom
                    'paint': {
                        'fill-extrusion-color': '#4c1d95', // [FIX] Porple hex
                        'fill-extrusion-height': ['get', 'height'],
                        'fill-extrusion-base': ['get', 'min_height'],
                        'fill-extrusion-opacity': 0.6
                    }
                },
                labelLayerId // Insert below labels
            );


            // 2. Load Wards Data (Polygons) for Extrusion
            m.addSource("delhi-wards", {
                type: "geojson",
                data: WARDS_DATA_URL,
            });

            // Ward Extrusion Layer - Initial state
            m.addLayer({
                id: "ward-extrusion",
                type: "fill-extrusion",
                source: "delhi-wards",
                paint: {
                    // Base color logic: Interpolate based on simulated 'vulnerability' if present
                    // Since data lacks it, we use a basic dark teal base
                    "fill-extrusion-color": [
                        "interpolate",
                        ["linear"],
                        ["get", "Shape_Area"], // Using area as a dummy proxy for variety initially
                        0, "#10b981", // Emerald
                        0.05, "#3b82f6"  // Blue
                    ],
                    "fill-extrusion-height": 0, // Starts flat
                    "fill-extrusion-opacity": 0.9,
                    "fill-extrusion-base": 0,
                },
            });

            // 3. Load Drains Basins (Lines)
            BASIN_FILES.forEach((file, index) => {
                const sourceId = `basin-${index}`;
                m.addSource(sourceId, { type: "geojson", data: file });

                // Neon Cyan Lines (00f2ff)
                m.addLayer({
                    id: `drain-lines-${index}`,
                    type: "line",
                    source: sourceId,
                    layout: {
                        "line-join": "round",
                        "line-cap": "round",
                    },
                    paint: {
                        "line-color": "#00f2ff", // Neon Cyan
                        "line-width": 2, // Could be data driven if prop exists
                        "line-blur": 0.5,
                        "line-opacity": 0.9,
                    },
                });

                // Glow effect layer
                m.addLayer({
                    id: `drain-glow-${index}`,
                    type: "line",
                    source: sourceId,
                    layout: { "line-join": "round" },
                    paint: {
                        "line-color": "#00f2ff",
                        "line-width": 8, // Thicker glow
                        "line-blur": 4,
                        "line-opacity": 0.4,
                    },
                });
            });

            // 4. Load Hotspots (Points) -> Custom Markers
            // We fetch the JSON manually to add custom markers
            fetch(HOTSPOTS_DATA_URL)
                .then(res => res.json())
                .then(data => {
                    if (data && data.features) {
                        data.features.forEach((feature: any) => {
                            // Determine type for marker style
                            const type = feature.properties.type || 'chronic';
                            const el = createPulsingMarker(type);

                            // Add badge to verified reports
                            const isVerified = feature.properties.verified_by_ai;
                            const badgeHtml = isVerified
                                ? `<span style="background:#0ea5e9; color:white; font-size:9px; padding:2px 4px; border-radius:4px; margin-bottom:4px; display:inline-block;">Verified AI</span>`
                                : '';

                            // Add popup
                            const popup = new mapboxgl.Popup({ offset: 25, className: 'bg-surface text-white' })
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
                                .setPopup(popup)
                                .addTo(m);
                        });
                    }
                })
                .catch(err => console.error("Failed to load hotspots", err));
        });

        // Resize handler
        const handleResize = () => map.current?.resize();
        window.addEventListener("resize", handleResize);

        // [FIX] Cleanup function
        return () => {
            window.removeEventListener("resize", handleResize);
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update Ward Extrusion based on Rainfall Intensity
    useEffect(() => {
        // Guard clause: check map current AND source existence before painting
        if (!map.current || !mapLoaded) return;
        const m = map.current;

        // Wait until style says it's ready or just check getLayer
        if (!m.getLayer("ward-extrusion")) return;

        const intensityFactor = rainfallIntensity / 100; // 0 to 1

        // We update the paint property.
        // Simulating that higher intensity = higher water level (extrusion) and redder color

        const extrusionHeight: any = [
            "interpolate",
            ["linear"],
            ["get", "Shape_Area"], // Again using shape area as a stable proxy for deterministic randomness
            0, 20 * intensityFactor,
            0.03, 500 * intensityFactor
        ];

        const extrusionColor: any = [
            "interpolate",
            ["linear"],
            ["*", ["get", "Shape_Area"], intensityFactor * 100],
            0, "#10b981", // Emerald (Safe)
            0.5, "#f59e0b", // Amber (Warning)
            1.5, "#ef4444"  // Red (Danger)
        ];

        m.setPaintProperty("ward-extrusion", "fill-extrusion-height", extrusionHeight);

        // Update color only if intensity is significant, else keep base cool colors
        if (rainfallIntensity > 10) {
            m.setPaintProperty("ward-extrusion", "fill-extrusion-color", extrusionColor);
        } else {
            // Reset to safe colors when low rain
            const safeColor: any = [
                "interpolate",
                ["linear"],
                ["get", "Shape_Area"],
                0, "#10b981",
                0.05, "#3b82f6"
            ];
            m.setPaintProperty("ward-extrusion", "fill-extrusion-color", safeColor);
        }
    }, [rainfallIntensity, mapLoaded]);

    return (
        <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-background" />
    );
}
