
import { NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Save to tmp
        const tempFilePath = join(os.tmpdir(), `upload-${Date.now()}-${file.name}`);
        await writeFile(tempFilePath, buffer);

        // Run python script
        // process.cwd() in Next.js usually points to project root.
        const scriptPath = join(process.cwd(), 'image_detection.py');

        // Try running with python3. 
        // If the environment handles python vs python3 differently this might need adjustment.
        const command = `python3 "${scriptPath}" "${tempFilePath}"`;

        console.log(`Executing: ${command}`);

        const { stdout, stderr } = await execAsync(command);

        // Clean up
        await unlink(tempFilePath);

        if (stderr && stderr.trim().length > 0) {
            console.error("Python stderr:", stderr);
        }

        console.log("Python stdout:", stdout);

        try {
            const result = JSON.parse(stdout);
            return NextResponse.json(result);
        } catch (e) {
            console.error("JSON parse error", e);
            return NextResponse.json({ error: 'Failed to parse python output', details: stdout }, { status: 500 });
        }

    } catch (error) {
        console.error('Error processing image:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
