// Simple in-memory database simulation
// In a real application, this would be a connection to a database like PostgreSQL or MongoDB

type Incident = {
    id: string;
    loc: string;
    type: string;
    time: string;
    status: "New" | "Assigned" | "Resolved";
    severe: boolean;
    description?: string;
};

type Dispatch = {
    id: string;
    team: string;
    action: string;
    eta: string;
    timestamp: string;
};

type Resources = {
    heavyPumps: { available: number; total: number };
    suctionTankers: { available: number; total: number };
    responseTeams: { available: number; total: number };
};

type DbData = {
    incidents: Incident[];
    dispatches: Dispatch[];
    resources: Resources;
};

let db: DbData = {
    incidents: [
        { id: "INC-2024-001", loc: "Minto Bridge", type: "Water Logging", time: "10 mins ago", status: "New", severe: true, description: "Severe water logging reported under bridge." },
        { id: "INC-2024-002", loc: "Lajpat Nagar", type: "Drain Blockage", time: "25 mins ago", status: "Assigned", severe: false, description: "Main drain blocked near market." },
        { id: "INC-2024-003", loc: "Connaught Place", type: "Water Logging", time: "1 hour ago", status: "Resolved", severe: false, description: "Minor water accumulation cleared." }
    ],
    dispatches: [],
    resources: {
        heavyPumps: { available: 5, total: 5 },
        suctionTankers: { available: 8, total: 8 },
        responseTeams: { available: 12, total: 12 }
    }
};

export const getDb = () => {
    return db;
};

export const updateDb = (data: DbData) => {
    db = data;
};
