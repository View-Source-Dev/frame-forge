import { readJob } from "@/lib/jobs/store";
import { modelLabel } from "@/lib/models/registry";
import { createShare } from "@/lib/shares/store";

export const runtime = "nodejs";

const MAX_GLB_BYTES = 50 * 1024 * 1024; // 50 MB

// POST /api/share — mint a public share from a result. The client exports the
// instantiated model to GLB and uploads it here; we persist that portable
// binary keyed by a fresh UUID (never re-running the pipeline). Access model is
// public-by-link for now; org-only / expiry is a Phase 3 follow-up.
export async function POST(request: Request): Promise<Response> {
	const form = await request.formData();
	const glb = form.get("glb");
	const jobId = (form.get("jobId") ?? "").toString();

	if (!(glb instanceof File)) {
		return Response.json({ error: "A GLB file is required." }, { status: 400 });
	}
	if (glb.size > MAX_GLB_BYTES) {
		return Response.json(
			{ error: "GLB exceeds the size limit." },
			{ status: 413 },
		);
	}

	const job = await readJob(jobId);
	if (!job?.result) {
		return Response.json(
			{ error: "Share must reference a finished job." },
			{ status: 400 },
		);
	}

	const bytes = Buffer.from(await glb.arrayBuffer());
	const meta = await createShare({
		jobId,
		title: modelLabel(job.result.modelKey),
		outcome: job.result.outcome,
		glb: bytes,
	});

	return Response.json(
		{ uuid: meta.uuid, path: `/share/${meta.uuid}` },
		{
			status: 201,
		},
	);
}
