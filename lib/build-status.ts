import fs from "fs/promises";
import path from "path";

export type BuildStatus = {
    status: "building" | "completed" | "failed";
    sandboxUrl?: string;
    message?: string;
    filesWritten?: string[];
    error?: string;
    updatedAt: string;
};

const BUILD_STATUS_PATH = path.join(process.cwd(), ".cache", "build-status.json");

export async function writeBuildStatus(status: BuildStatus): Promise<void> {
    await fs.mkdir(path.dirname(BUILD_STATUS_PATH), { recursive: true });
    await fs.writeFile(BUILD_STATUS_PATH, JSON.stringify(status, null, 2), "utf-8");
}

export async function readBuildStatus(): Promise<BuildStatus | null> {
    try {
        const raw = await fs.readFile(BUILD_STATUS_PATH, "utf-8");
        return JSON.parse(raw) as BuildStatus;
    } catch {
        return null;
    }
}
