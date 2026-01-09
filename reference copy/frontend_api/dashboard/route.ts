import { NextResponse } from 'next/server';
import { getDb, updateDb } from '@/lib/db';

export async function GET() {
    const data = getDb();
    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const body = await request.json();
    const data = getDb();

    // Determine type of action
    if (body.action === 'create_incident') {
        const newIncident = {
            id: `INC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`,
            time: "Just now",
            status: "New",
            severe: body.severe || true,
            ...body.data
        };
        data.incidents.unshift(newIncident);
    } else if (body.action === 'update_incident') {
        const { id, status } = body;
        const incidentIndex = data.incidents.findIndex((i: any) => i.id === id);

        if (incidentIndex > -1) {
            const oldStatus = data.incidents[incidentIndex].status;
            data.incidents[incidentIndex].status = status;

            // Resource Logic
            if (status === 'Assigned' && oldStatus !== 'Assigned') {
                // Initialize dispatches if they don't exist
                if (!data.dispatches) data.dispatches = [];

                // Dispatching consumes resources
                if (data.resources.responseTeams.available > 0) {
                    data.resources.responseTeams.available -= 1;
                }

                let vehicleAction = "en route";
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
}
