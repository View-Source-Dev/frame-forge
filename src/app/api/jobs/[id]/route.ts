import { readJob } from "@/lib/jobs/store";

export const runtime = "nodejs";

// GET /api/jobs/[id] — current job state for polling.
export async function GET(
	_request: Request,
	{ params }: RouteContext<"/api/jobs/[id]">,
): Promise<Response> {
	const { id } = await params;
	const job = await readJob(id);
	if (!job) return Response.json({ error: "Job not found." }, { status: 404 });
	return Response.json(job);
}
