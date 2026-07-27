import { promises as fs } from "node:fs";
import path from "node:path";
import { DATA_ROOT } from "@/lib/storage";

export interface WorkerHeartbeat {
	pid: number;
	state: "starting" | "idle" | "running" | "stopping";
	currentJobId: string | null;
	model: string;
	updatedAt: string;
}

const HEARTBEAT_FILE = path.join(DATA_ROOT, "worker-health.json");
const MAX_AGE_MS = Number(process.env.WORKER_HEARTBEAT_MAX_AGE_MS ?? 45_000);

export async function readWorkerHeartbeat(): Promise<WorkerHeartbeat | null> {
	try {
		const raw = await fs.readFile(HEARTBEAT_FILE, "utf8");
		return JSON.parse(raw) as WorkerHeartbeat;
	} catch (error) {
		if (
			(error as NodeJS.ErrnoException).code === "ENOENT" ||
			error instanceof SyntaxError
		)
			return null;
		throw error;
	}
}

export function isWorkerHeartbeatFresh(
	heartbeat: WorkerHeartbeat | null,
): boolean {
	if (!heartbeat || heartbeat.state === "stopping") return false;
	const updatedAt = Date.parse(heartbeat.updatedAt);
	return Number.isFinite(updatedAt) && Date.now() - updatedAt <= MAX_AGE_MS;
}
