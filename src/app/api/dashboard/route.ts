import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Prevent static caching

// --- In-lined Database Logic to Prevent Import Errors ---
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

// Global variable to hold state in memory (per server instance)
/* eslint-disable no-var */
declare global {
    var __mockDb: DbData | undefined;
}
/* eslint-enable no-var */

if (!global.__mockDb) {
    global.__mockDb = {
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
}

const getDb = () => global.__mockDb!;
const updateDb = (data: DbData) => { global.__mockDb = data; };
// ---------------------------------------------------------

export async function GET() {
    console.log("API: Handling GET request for /api/dashboard");
    try {
        const data = getDb();
        return NextResponse.json(data);
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const data = getDb();

        // Determine type of action
        if (body.action === 'create_incident') {
            const newIncident = {
                id: `INC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`,
                time: "Just now",
                status: "New" as const, // Fix type inference
                severe: body.severe || true,
                ...body.data
            };
            // @ts-ignore - Dynamic data structure
            data.incidents.unshift(newIncident);
        } else if (body.action === 'update_incident') {
            const { id, status } = body;
            const incidentIndex = data.incidents.findIndex((i: any) => i.id === id);

            if (incidentIndex > -1) {
                const oldStatus = data.incidents[incidentIndex].status;
                // @ts-ignore
                data.incidents[incidentIndex].status = status;

                // Resource Logic
                if (status === 'Assigned' && oldStatus !== 'Assigned') {
                    // Initialize dispatches if they don't exist
                    if (!data.dispatches) data.dispatches = [];

                    // Dispatching consumes resources
                    if (data.resources.responseTeams.available > 0) {
                        data.resources.responseTeams.available -= 1;
                    }

                    let vehicleType = "Response Team";

                    // Randomly assign a vehicle type
                    if (Math.random() > 0.5 && data.resources.heavyPumps.available > 0) {
                        data.resources.heavyPumps.available -= 1;
                        vehicleType = `Heavy Pump ${Math.floor(Math.random() * 10) + 1}`;
                    } else if (data.resources.suctionTankers.available > 0) {
                        data.resources.suctionTankers.available -= 1;
                        vehicleType = `Suction Tanker ${Math.floor(Math.random() * 10) + 1}`;
                    } else {
                        vehicleType = `Team ${['Alpha', 'Bravo', 'Charlie', 'Delta'][Math.floor(Math.random() * 4)]}`;
                    }

                    // Create Dispatch Record
                    data.dispatches.unshift({
                        id: `DIS-${Date.now().toString().slice(-4)}`,
                        team: vehicleType,
                        action: `en route to ${data.incidents[incidentIndex].loc}`,
                        eta: `${Math.floor(Math.random() * 20) + 5} mins`,
                        timestamp: "Just now"
                    });

                } else if (status === 'Resolved' && oldStatus !== 'Resolved') {
                    // Resolving frees up resources (simplified logic)
                    if (data.resources.responseTeams.available < data.resources.responseTeams.total) {
                        data.resources.responseTeams.available += 1;
                    }
                    // Add back minimal vehicle chance
                    if (Math.random() > 0.5 && data.resources.heavyPumps.available < data.resources.heavyPumps.total) {
                        data.resources.heavyPumps.available += 1;
                    }
                }
            }
        } else if (body.action === 'delete_incident') {
            data.incidents = data.incidents.filter((i: any) => i.id !== body.id);
        }

        updateDb(data);
        return NextResponse.json(data);
    } catch (error) {
        console.error("API POST Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
