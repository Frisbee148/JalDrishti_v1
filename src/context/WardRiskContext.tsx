"use client";

import { createContext, useContext, useState } from "react";

interface WardRiskState {
    wardScores: Record<string, number>;
    rainfall: number;
    setWardRisk: (scores: Record<string, number>, rainfall: number) => void;
}

const WardRiskContext = createContext<WardRiskState>({
    wardScores: {},
    rainfall: 0,
    setWardRisk: () => {},
});

export function WardRiskProvider({ children }: { children: React.ReactNode }) {
    const [wardScores, setWardScores] = useState<Record<string, number>>({});
    const [rainfall, setRainfall] = useState(0);

    const setWardRisk = (scores: Record<string, number>, rain: number) => {
        setWardScores(scores);
        setRainfall(rain);
    };

    return (
        <WardRiskContext.Provider value={{ wardScores, rainfall, setWardRisk }}>
            {children}
        </WardRiskContext.Provider>
    );
}

export const useWardRisk = () => useContext(WardRiskContext);
