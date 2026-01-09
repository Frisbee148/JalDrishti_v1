"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Incident = {
    id: string;
    loc: string;
    type: string;
    time: string;
    status: "New" | "Assigned" | "Resolved";
    severe: boolean;
    description?: string;
};

export type Dispatch = {
    id: string;
    team: string;
    action: string;
    eta: string;
    timestamp: string;
};

export type Resources = {
    heavyPumps: { available: number; total: number };
    suctionTankers: { available: number; total: number };
    responseTeams: { available: number; total: number };
};

interface DashboardContextType {
    incidents: Incident[];
    dispatches: Dispatch[];
    resources: Resources;
    addIncident: (data: any) => void;
    updateIncidentStatus: (id: string, status: string) => void;
    deleteIncident: (id: string) => void;
    refreshData: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function IncidentProvider({ children }: { children: React.ReactNode }) {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [dispatches, setDispatches] = useState<Dispatch[]>([]);
    const [resources, setResources] = useState<Resources>({
        heavyPumps: { available: 0, total: 0 },
        suctionTankers: { available: 0, total: 0 },
        responseTeams: { available: 0, total: 0 }
    });

    const fetchData = async () => {
        try {
            console.log("Context: Fetching /api/dashboard...");
            const res = await fetch('/api/dashboard', { cache: 'no-store' }); // Disable caching
            console.log("Context: Fetch response status:", res.status);

            if (!res.ok) {
                throw new Error(`Server returned ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            setIncidents(data.incidents || []);
            setDispatches(data.dispatches || []);
            setResources(data.resources);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        }
    };

    // Load initial data
    useEffect(() => {
        fetchData();
        // Poll every 10 seconds for updates
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const performAction = async (payload: any) => {
        try {
            const res = await fetch('/api/dashboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            setIncidents(data.incidents || []);
            setDispatches(data.dispatches || []);
            setResources(data.resources);
        } catch (error) {
            console.error("Action failed", error);
        }
    };

    const addIncident = (data: any) => {
        performAction({ action: 'create_incident', data });
    };

    const updateIncidentStatus = (id: string, status: string) => {
        performAction({ action: 'update_incident', id, status });
    };

    const deleteIncident = (id: string) => {
        performAction({ action: 'delete_incident', id });
    };

    return (
        <DashboardContext.Provider value={{ incidents, dispatches, resources, addIncident, updateIncidentStatus, deleteIncident, refreshData: fetchData }}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useIncidents() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error("useIncidents must be used within an IncidentProvider");
    }
    return context;
}
