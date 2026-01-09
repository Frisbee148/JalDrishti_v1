"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface LocationSpot {
    latitude: number;
    longitude: number;
    ward: string;
    risk_score: number;
    status: "High" | "Medium" | "Low";
    population?: number | string;
}

interface FactorMapProps {
    activeFactor: string;
    dynamicRainfall?: number;
    locations?: LocationSpot[];
    wardRisks?: Record<string, string>;
    wardScores?: Record<string, number>;
    activeView?: 'mixed' | 'points' | 'regions';
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
const WARDS_DATA_URL = "/data/delhi-wards.geojson";

// Helper for color gradient
const getRiskColor = (score: number) => {
    if (score > 80) return "#991b1b"; // Dark Red
    if (score > 60) return "#ef4444"; // Red
    if (score > 40) return "#f97316"; // Orange
    if (score > 20) return "#eab308"; // Yellow
    if (score > 10) return "#84cc16"; // Lime
    return "#22c55e"; // Green
};

export function FactorMap({ activeFactor, dynamicRainfall = 0, locations = [], wardRisks = {}, wardScores = {}, activeView = "mixed" }: FactorMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;
        if (!mapboxgl.supported()) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/light-v11",
            center: [77.1025, 28.7041],
            zoom: 10,
            pitch: 45,
            bearing: 0,
            antialias: true
        });

        map.current.on('click', (e) => {
            if (!map.current) return;
            const features = map.current.queryRenderedFeatures(e.point, { layers: ['risk-points-layer', 'risk-pulse-layer'] });

            if (features.length > 0) {
                const feature = features[0];
                const props = feature.properties as any;
                const coordinates = (feature.geometry as any).coordinates.slice();

                const popupContent = `
                    <div style="font-family: sans-serif; padding: 5px; color: #333;">
                        <h3 style="margin: 0 0 5px 0; font-weight: bold; font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 3px;">
                            ${props.ward || 'Unknown Ward'}
                        </h3>
                        <div style="font-size: 12px; line-height: 1.5;">
                            <div><strong>Risk Status:</strong> <span style="color: ${props.status === 'High' ? '#ef4444' : props.status === 'Medium' ? '#eab308' : '#22c55e'}; font-weight: bold;">${props.status}</span></div>
                            <div><strong>Probability:</strong> ${props.score || 'N/A'}%</div>
                            ${props.population && props.population !== "N/A" ? `<div><strong>Est. Pop:</strong> ${props.population}</div>` : ''}
                            <div style="font-size: 10px; color: #666; margin-top: 4px;">Lat: ${coordinates[1].toFixed(4)}, Lon: ${coordinates[0].toFixed(4)}</div>
                        </div>
                    </div>
                `;
                new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML(popupContent)
                    .addTo(map.current!);
            }
        });

        // Change cursor on hover
        map.current.on('mouseenter', 'risk-points-layer', () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer'; });
        map.current.on('mouseleave', 'risk-points-layer', () => { if (map.current) map.current.getCanvas().style.cursor = ''; });

        map.current.on('style.load', () => {
            map.current?.addSource("mapbox-dem", {
                type: "raster-dem",
                url: "mapbox://mapbox.mapbox-terrain-dem-v1",
                tileSize: 512,
                maxzoom: 14,
            });
            map.current?.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
        });

        map.current.on("load", () => {
            if (!map.current) return;
            const m = map.current;
            setMapLoaded(true);

            m.addSource("delhi-wards", {
                type: "geojson",
                data: WARDS_DATA_URL,
            });

            m.addLayer({
                id: "factor-fill",
                type: "fill",
                source: "delhi-wards",
                paint: {
                    "fill-opacity": 0.8,
                    "fill-outline-color": "rgba(255,255,255,0.2)"
                }
            });
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Effect to update style based on Factor or Rainfall
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        const m = map.current;
        if (!m.getLayer("factor-fill")) return;

        let fillColor: any = "#aaaaaa";
        let fillOpacity = 0.8;

        switch (activeFactor) {
            case "ws-dens":
                fillColor = ["interpolate", ["linear"], ["%", ["get", "Shape_Area"], 13], 0, "#fee2e2", 4, "#f87171", 9, "#b91c1c"];
                break;
            case "pop-dens":
                fillColor = ["interpolate", ["linear"], ["%", ["*", ["get", "Shape_Area"], 100], 17], 0, "#fff7ed", 7, "#fdba74", 15, "#9a3412"];
                break;
            case "road-dens":
                fillColor = ["interpolate", ["linear"], ["%", ["*", ["get", "Shape_Area"], 200], 13], 0, "#f3f4f6", 5, "#9ca3af", 10, "#1f2937"];
                break;
            case "dem":
                fillColor = ["interpolate", ["linear"], ["get", "Shape_Area"], 0.01, "rgba(255, 255, 255, 0.1)", 0.05, "rgba(0, 0, 0, 0.1)"];
                break;
            case "ndvi":
                fillColor = ["interpolate", ["linear"], ["%", ["*", ["get", "Shape_Area"], 55], 19], 0, "#f0fdf4", 5, "#4ade80", 15, "#14532d"];
                break;
            case "mndwi":
                fillColor = ["interpolate", ["linear"], ["%", ["*", ["get", "Shape_Area"], 77], 23], 0, "#f0f9ff", 5, "#38bdf8", 20, "#0c4a6e"];
                break;
            case "isp":
                fillColor = ["interpolate", ["linear"], ["%", ["*", ["get", "Shape_Area"], 88], 11], 0, "#faf5ff", 4, "#c084fc", 9, "#581c87"];
                break;
            case "simulation":
                const showRegions = activeView === 'mixed' || activeView === 'regions';
                const showPoints = activeView === 'mixed' || activeView === 'points';

                // Combined check for data
                const hasScoreData = wardScores && Object.keys(wardScores).length > 0;
                const hasRiskData = wardRisks && Object.keys(wardRisks).length > 0;

                if (hasScoreData || hasRiskData) {
                    // CRITICAL FIX: The GeoJSON uses "Ward_Name" (Case Sensitive Property)
                    // We must UPCASE the property from the map to match the backend's UPPERCASE keys
                    const matchExpr: any[] = ["match", ["upcase", ["get", "Ward_Name"]]];

                    if (hasScoreData) {
                        // Use gradient if scores available
                        Object.entries(wardScores).forEach(([ward, score]) => {
                            matchExpr.push(ward); // Backend sends UPPERCASE (e.g. "VIKAS PURI")
                            matchExpr.push(getRiskColor(score));
                        });
                    } else {
                        // Fallback to simple categories
                        Object.entries(wardRisks).forEach(([ward, status]) => {
                            matchExpr.push(ward);
                            if (status === "High") matchExpr.push("#ef4444");
                            else if (status === "Medium") matchExpr.push("#eab308");
                            else matchExpr.push("#22c55e");
                        });
                    }

                    matchExpr.push("#9ca3af");

                    if (showRegions) {
                        m.setPaintProperty("factor-fill", "fill-color", matchExpr as any);
                        fillOpacity = activeView === 'regions' ? 0.7 : 0.3;
                        fillColor = null; // Handled by setPaintProperty
                    } else {
                        fillColor = "#000000";
                        fillOpacity = 0.5;
                    }
                } else {
                    const factor = Math.min(15, dynamicRainfall / 15);
                    fillColor = [
                        "interpolate", ["linear"],
                        ["+", ["%", ["*", ["to-number", ["get", "Shape_Area"]], 1337], 10], factor],
                        0, "#22c55e", 5, "#eab308", 10, "#fb923c", 15, "#ef4444", 25, "#b91c1c"
                    ];
                    fillOpacity = showRegions ? 0.4 : 0.1;
                }

                // 2. Risk Points Layer (Markers)
                const pointsGeoJSON: any = {
                    type: "FeatureCollection",
                    features: locations.map(loc => ({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [loc.longitude, loc.latitude] },
                        properties: { status: loc.status, ward: loc.ward, score: loc.risk_score, population: loc.population }
                    }))
                };

                const criticalPointsGeoJSON: any = {
                    type: "FeatureCollection",
                    features: locations.filter(l => l.status === "High" || l.status === "Medium").map(loc => ({
                        type: "Feature",
                        geometry: { type: "Point", coordinates: [loc.longitude, loc.latitude] },
                        properties: { status: loc.status }
                    }))
                };

                if (m.getSource("risk-points")) (m.getSource("risk-points") as any).setData(pointsGeoJSON);
                else m.addSource("risk-points", { type: "geojson", data: pointsGeoJSON });

                if (m.getSource("risk-pulse")) (m.getSource("risk-pulse") as any).setData(criticalPointsGeoJSON);
                else m.addSource("risk-pulse", { type: "geojson", data: criticalPointsGeoJSON });

                if (!m.getLayer("risk-points-layer")) {
                    m.addLayer({
                        id: "risk-points-layer",
                        type: "circle",
                        source: "risk-points",
                        paint: {
                            "circle-radius": 6,
                            "circle-color": ["match", ["get", "status"], "High", "#b91c1c", "Medium", "#ca8a04", "Low", "#15803d", "#ffffff"],
                            "circle-stroke-width": 2, "circle-stroke-color": "#ffffff"
                        }
                    });
                }
                if (!m.getLayer("risk-pulse-layer")) {
                    m.addLayer({
                        id: "risk-pulse-layer",
                        type: "circle",
                        source: "risk-pulse",
                        paint: {
                            "circle-radius": 15,
                            "circle-color": ["match", ["get", "status"], "High", "#ef4444", "Medium", "#eab308", "transparent"],
                            "circle-opacity": 0.5,
                            "circle-blur": 0.5
                        }
                    });
                }

                const visibility = showPoints ? "visible" : "none";
                if (m.getLayer("risk-points-layer")) m.setLayoutProperty("risk-points-layer", "visibility", visibility);
                if (m.getLayer("risk-pulse-layer")) m.setLayoutProperty("risk-pulse-layer", "visibility", visibility);
                break;
        }

        if (activeFactor !== "simulation") {
            if (m.getLayer("risk-points-layer")) m.setLayoutProperty("risk-points-layer", "visibility", "none");
            if (m.getLayer("risk-pulse-layer")) m.setLayoutProperty("risk-pulse-layer", "visibility", "none");
        }

        if (activeFactor !== "simulation" || (activeFactor === "simulation" && fillColor !== null)) {
            m.setPaintProperty("factor-fill", "fill-color", fillColor);
        }

        m.setPaintProperty("factor-fill", "fill-opacity", activeFactor === "simulation" ? fillOpacity : 0.8);

        if (activeFactor === 'dem') {
            m.setTerrain({ source: "mapbox-dem", exaggeration: 3.5 });
            m.setPitch(60);
        } else {
            m.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
            m.setPitch(45);
        }

    }, [activeFactor, mapLoaded, dynamicRainfall, locations, wardRisks, wardScores, activeView]);

    // Animation Loop
    useEffect(() => {
        if (!mapLoaded || !map.current) return;
        const m = map.current;
        let animationFrameId: number;

        const animate = (time: number) => {
            const duration = 1500;
            const t = (time % duration) / duration;

            if (m.getLayer("risk-pulse-layer")) {
                const radius = 8 + (15 * t);
                const opacity = 0.8 * (1 - t);
                m.setPaintProperty("risk-pulse-layer", "circle-radius", radius);
                m.setPaintProperty("risk-pulse-layer", "circle-opacity", opacity);
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        if (activeFactor === "simulation") {
            animationFrameId = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(animationFrameId);
    }, [mapLoaded, activeFactor]);

    return <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10" />;
}
