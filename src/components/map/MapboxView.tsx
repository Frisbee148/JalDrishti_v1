"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapboxViewProps {
    rainfallIntensity: number;
    liveReports?: any[];
    wardScores?: Record<string, number>;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const createPulsingMarker = (type: string) => {
    const el = document.createElement('div');
    el.className = type === 'citizen_report' ? 'marker-pulse-amber' : 'marker-pulse';
    return el;
};

const createHotspotMarker = () => {
    const el = document.createElement('div');
    el.className = 'marker-hotspot';
    return el;
};

const WARDS_DATA_URL = "/data/delhi-wards.geojson";
const HOTSPOTS_URL = "/data/hotspots.json";
const BASIN_FILES = [
    "/data/delhi_drains/najafgarh_basin.json",
    "/data/delhi_drains/barapullah_basin.json",
    "/data/delhi_drains/shadara_yamuna_basin.json"
];
const MAX_RAINFALL = 120;

export function MapboxView({ rainfallIntensity, liveReports, wardScores }: MapboxViewProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const popup = useRef<mapboxgl.Popup | null>(null);
    const reportMarkers = useRef<mapboxgl.Marker[]>([]);
    const hotspotMarkers = useRef<mapboxgl.Marker[]>([]);
    const geojsonCache = useRef<any>(null);
    const lastScoresRef = useRef<Record<string, number> | undefined>(undefined);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Render live report markers
    useEffect(() => {
        if (!map.current || !mapLoaded || !liveReports) return;
        const m = map.current;

        reportMarkers.current.forEach(marker => marker.remove());
        reportMarkers.current = [];

        liveReports.forEach(report => {
            const el = createPulsingMarker('citizen_report');
            const isFullyVerified = report.admin_status === "approved";
            const badgeColor = isFullyVerified ? "#10b981" : "#0ea5e9";
            const badgeText = isFullyVerified ? "Verified by AI & Admin" : "Verified using AI only";

            const markerPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div style="color:black; padding:8px; min-width:200px;">
                    <span style="background:${badgeColor}; color:white; font-size:10px; padding:3px 6px; border-radius:4px; margin-bottom:6px; display:inline-block; font-weight:600;">${badgeText}</span>
                    <h4 style="font-weight:bold; margin-bottom:4px;">Waterlogging Reported</h4>
                    <p style="font-size:12px; margin-bottom:8px;">${report.location}</p>
                    <div style="background:#f1f5f9; padding:6px; border-radius:4px; font-size:11px;">
                        <p><strong>Severity:</strong> ${report.ai_analysis.severity}</p>
                        <p><strong>Depth:</strong> ${report.ai_analysis.estimated_depth}</p>
                        <p><strong>Confidence:</strong> ${report.ai_analysis.confidence}%</p>
                    </div>
                    <p style="font-size:10px; color:#64748b; margin-top:8px;">Report ID: ${report.id.slice(0, 6)}</p>
                </div>
            `);

            const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([report.coordinates.lng, report.coordinates.lat])
                .setPopup(markerPopup)
                .addTo(m);
            reportMarkers.current.push(marker);
        });
    }, [liveReports, mapLoaded]);

    // Load and render hotspot markers
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        const m = map.current;

        fetch(HOTSPOTS_URL)
            .then(res => res.json())
            .then((data: any) => {
                // Clean up old markers
                hotspotMarkers.current.forEach(marker => marker.remove());
                hotspotMarkers.current = [];

                (data.features || []).forEach((feature: any) => {
                    const props = feature.properties;
                    const coords = feature.geometry.coordinates;
                    const isChronicOrOfficial = props.type === "chronic" || props.type === "official";

                    const el = createHotspotMarker();

                    const severityColor = props.type === "chronic" ? "#ef4444" : "#f97316";
                    const severityLabel = props.type === "chronic" ? "CHRONIC HOTSPOT" : "KNOWN HOTSPOT";

                    const hotspotPopup = new mapboxgl.Popup({ offset: 25, maxWidth: '300px' }).setHTML(`
                        <div style="color:black; padding:10px; min-width:240px; font-family:system-ui;">
                            <span style="background:${severityColor}; color:white; font-size:9px; padding:2px 8px; border-radius:3px; margin-bottom:8px; display:inline-block; font-weight:700; letter-spacing:0.5px;">${severityLabel}</span>
                            <h4 style="font-weight:bold; font-size:14px; margin:6px 0 4px 0; color:#1e293b;">${props.name}</h4>
                            <p style="font-size:11px; color:#64748b; margin-bottom:8px; line-height:1.4;">${props.description}</p>
                            <div style="background:#fef2f2; padding:6px 8px; border-radius:4px; font-size:10px; border:1px solid #fecaca;">
                                <span style="color:#991b1b; font-weight:600;">Basin:</span> <span style="color:#7f1d1d;">${props.basin}</span>
                            </div>
                        </div>
                    `);

                    const marker = new mapboxgl.Marker({ element: el })
                        .setLngLat([coords[0], coords[1]])
                        .setPopup(hotspotPopup)
                        .addTo(m);
                    hotspotMarkers.current.push(marker);
                });
            })
            .catch(err => console.error("Hotspot data load failed", err));
    }, [mapLoaded]);

    // Map initialisation
    useEffect(() => {
        if (map.current || !mapContainer.current) return;
        if (!MAPBOX_TOKEN) { console.error("Mapbox token missing"); return; }

        mapboxgl.accessToken = MAPBOX_TOKEN;

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/standard",
            center: [77.2090, 28.6139],
            zoom: 14.5,
            pitch: 65,
            bearing: -15,
            antialias: true,
        });

        popup.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: false, className: 'ward-popup' });

        map.current.on("load", async () => {
            if (!map.current) return;
            const m = map.current;
            m.resize();

            // Cache GeoJSON — needed to enrich features with RF risk_score on each slider move
            try {
                const res = await fetch(WARDS_DATA_URL);
                geojsonCache.current = await res.json();
            } catch (e) {
                console.error("Ward GeoJSON load failed", e);
            }

            // 3D terrain
            m.addSource("mapbox-dem", { type: "raster-dem", url: "mapbox://mapbox.mapbox-terrain-dem-v1", tileSize: 512, maxzoom: 14 });
            m.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

            // Ward source
            m.addSource("delhi-wards", { type: "geojson", data: geojsonCache.current || WARDS_DATA_URL });

            // Water extrusion — all wards, colour/height driven by RF risk_score + rainfall
            // Smooth transitions: 800ms duration for height and color to prevent jarring jumps
            m.addLayer({
                id: "delhi-wards-risk",
                type: "fill-extrusion",
                source: "delhi-wards",
                paint: {
                    "fill-extrusion-color": "#c084fc",
                    "fill-extrusion-height": 0,
                    "fill-extrusion-base": 0,
                    "fill-extrusion-opacity": 0,
                    "fill-extrusion-height-transition": { duration: 800, delay: 0 },
                    "fill-extrusion-color-transition": { duration: 600, delay: 0 },
                    "fill-extrusion-opacity-transition": { duration: 500, delay: 0 },
                },
            });

            // Danger flash layer — only wards with risk_score >= 75, pulses red at high rainfall
            m.addLayer({
                id: "delhi-wards-danger",
                type: "fill-extrusion",
                source: "delhi-wards",
                filter: [">=", ["coalesce", ["get", "risk_score"], 0], 75],
                paint: {
                    "fill-extrusion-color": "#ef4444",
                    "fill-extrusion-height": 0,
                    "fill-extrusion-base": 0,
                    "fill-extrusion-opacity": 0,
                    "fill-extrusion-opacity-transition": { duration: 800, delay: 0 },
                    "fill-extrusion-height-transition": { duration: 800, delay: 0 },
                },
            });

            // Ward outline
            m.addLayer({
                id: "ward-outline",
                type: "line",
                source: "delhi-wards",
                paint: { "line-color": "#6200EA", "line-width": 1.2, "line-opacity": 0.7 },
            });

            // Drain basin lines + glow
            BASIN_FILES.forEach((file, index) => {
                const sid = `basin-${index}`;
                m.addSource(sid, { type: "geojson", data: file });
                m.addLayer({ id: `drain-lines-${index}`, type: "line", source: sid, layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#00f2ff", "line-width": 2, "line-blur": 0.5, "line-opacity": 0.9 } });
                m.addLayer({ id: `drain-glow-${index}`, type: "line", source: sid, layout: { "line-join": "round" }, paint: { "line-color": "#00f2ff", "line-width": 8, "line-blur": 4, "line-opacity": 0.4 } });
            });

            // Ward click popup — shows RF risk score
            m.on('click', 'delhi-wards-risk', (e) => {
                if (!e.features || e.features.length === 0) return;
                const props = e.features[0].properties || {};
                const wardName = props.Ward_Name || `Ward ${props.Ward_No || 'Unknown'}`;
                const riskScore: number = Number(props.risk_score ?? 40);
                const rain = (window as any).__currentRainfallIntensity || 0;

                let riskLevel = "Safe";
                let riskColor = "#22c55e";
                if (riskScore > 80)      { riskLevel = "Critical"; riskColor = "#ef4444"; }
                else if (riskScore > 60) { riskLevel = "High";     riskColor = "#f97316"; }
                else if (riskScore > 40) { riskLevel = "Moderate"; riskColor = "#eab308"; }

                const liveRisk = Math.min(100, (riskScore / 100) * (rain / MAX_RAINFALL) * 100).toFixed(0);

                popup.current?.setLngLat(e.lngLat).setHTML(`
                    <div style="padding:12px; min-width:220px; font-family:system-ui;">
                        <h4 style="font-weight:bold; font-size:16px; margin:0 0 12px 0; color:#1e293b;">${wardName}</h4>
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="color:#64748b;">Risk Score:</span>
                            <span style="font-weight:600; color:#6200EA;">${riskScore.toFixed(0)}/100</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <span style="color:#64748b;">Rainfall:</span>
                            <span style="font-weight:600;">${rain} mm/hr</span>
                        </div>
                        <hr style="border:none; border-top:1px solid #e2e8f0; margin:10px 0;"/>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="color:#64748b;">Live Flood Risk:</span>
                            <span style="font-weight:bold; font-size:20px; color:${riskColor};">${liveRisk}%</span>
                        </div>
                        <div style="margin-top:10px; padding:8px; background:${riskColor}15; border-radius:6px; text-align:center; border:1px solid ${riskColor}40;">
                            <span style="color:${riskColor}; font-weight:700; text-transform:uppercase;">${riskLevel}</span>
                        </div>
                    </div>
                `).addTo(m);
            });

            m.on('mouseenter', 'delhi-wards-risk', () => { m.getCanvas().style.cursor = 'pointer'; });
            m.on('mouseleave', 'delhi-wards-risk', () => { m.getCanvas().style.cursor = ''; });

            setMapLoaded(true);
        });

        const handleResize = () => map.current?.resize();
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update GeoJSON source ONLY when wardScores actually change (not on every rainfall tick)
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        const m = map.current;

        const hasScores = wardScores && Object.keys(wardScores).length > 0;
        if (!hasScores || !geojsonCache.current) return;

        // Skip if scores haven't changed (same reference or same values)
        if (lastScoresRef.current === wardScores) return;
        lastScoresRef.current = wardScores;

        const enriched = {
            ...geojsonCache.current,
            features: geojsonCache.current.features.map((f: any) => ({
                ...f,
                properties: { ...f.properties, risk_score: wardScores![f.properties.Ward_Name] ?? 40 },
            })),
        };
        (m.getSource("delhi-wards") as mapboxgl.GeoJSONSource).setData(enriched);
    }, [wardScores, mapLoaded]);

    // Update 3D water extrusion PAINT properties when rainfall changes
    // This is decoupled from the GeoJSON data update above for smooth visual transitions
    useEffect(() => {
        if (!map.current || !mapLoaded) return;
        const m = map.current;

        (window as any).__currentRainfallIntensity = rainfallIntensity;

        if (!m.getLayer("delhi-wards-risk")) return;

        const hasScores = wardScores && Object.keys(wardScores).length > 0;

        // Height — per-ward RF score × rainfall scaling
        // Uses Mapbox expression interpolation so transitions happen per-feature smoothly
        const heightExpr: mapboxgl.Expression = hasScores
            ? ["*", ["/", ["coalesce", ["get", "risk_score"], 40], 100], rainfallIntensity * 2] as mapboxgl.Expression
            : ["literal", rainfallIntensity * 1.5] as mapboxgl.Expression;

        const dangerHeightExpr: mapboxgl.Expression = hasScores
            ? ["*", ["/", ["coalesce", ["get", "risk_score"], 0], 100], rainfallIntensity * 2.5] as mapboxgl.Expression
            : ["literal", rainfallIntensity * 2] as mapboxgl.Expression;

        m.setPaintProperty("delhi-wards-risk", "fill-extrusion-height", heightExpr);
        m.setPaintProperty("delhi-wards-danger", "fill-extrusion-height", dangerHeightExpr);

        // Colour — interpolate on per-ward risk_score: purple → violet → yellow → orange → red
        const colorExpr: mapboxgl.Expression = hasScores
            ? ["interpolate", ["linear"], ["coalesce", ["get", "risk_score"], 40],
                0,  "#c084fc",
                35, "#a855f7",
                60, "#facc15",
                78, "#f97316",
                90, "#ef4444"]
            : ["interpolate", ["linear"], ["literal", rainfallIntensity / MAX_RAINFALL],
                0,    "#c084fc",
                0.3,  "#a855f7",
                0.5,  "#facc15",
                0.75, "#f97316",
                1.0,  "#ef4444"];

        m.setPaintProperty("delhi-wards-risk", "fill-extrusion-color", colorExpr);

        // Opacity — smooth fade in/out based on rainfall, not binary 0/0.55
        const riskOpacity = rainfallIntensity > 0
            ? Math.min(0.6, 0.15 + (rainfallIntensity / MAX_RAINFALL) * 0.45)
            : 0;
        m.setPaintProperty("delhi-wards-risk", "fill-extrusion-opacity", riskOpacity);

        // Danger flash — graduated opacity instead of binary threshold
        // Starts fading in at 50mm, full at 100mm
        const dangerOpacity = rainfallIntensity > 50
            ? Math.min(0.85, (rainfallIntensity - 50) / 70 * 0.85)
            : 0;
        m.setPaintProperty("delhi-wards-danger", "fill-extrusion-opacity", dangerOpacity);

    }, [rainfallIntensity, wardScores, mapLoaded]);

    return (
        <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-background" />
    );
}
