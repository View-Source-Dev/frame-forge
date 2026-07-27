import {
	isWorkerHeartbeatFresh,
	readWorkerHeartbeat,
} from "@/lib/worker/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
	const stubMode = process.env.FORGE_USE_STUB === "1";
	const heartbeat = stubMode ? null : await readWorkerHeartbeat();
	const workerReady = stubMode || isWorkerHeartbeatFresh(heartbeat);
	const strict = new URL(request.url).searchParams.get("strict") === "1";

	return Response.json(
		{
			status: workerReady ? "ok" : "degraded",
			web: { ready: true },
			worker: {
				mode: stubMode ? "stub" : "claude-agent-sdk",
				ready: workerReady,
				heartbeat,
			},
		},
		{
			status: strict && !workerReady ? 503 : 200,
			headers: { "Cache-Control": "no-store" },
		},
	);
}
