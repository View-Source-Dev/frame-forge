import { readJob, readModel } from "@/lib/jobs/store";
import { modelLabel } from "@/lib/models/registry";
import { createShare } from "@/lib/shares/store";

export const runtime = "nodejs";

const MAX_GLB_BYTES = 50 * 1024 * 1024; // 50 MB

// POST /api/share — mint a public share from a result. We persist a portable GLB
// keyed by a fresh UUID (never re-running the pipeline). The GLB comes either
// from the client (procedural/stub jobs export it in-browser) or, for real
// worker jobs, from the artifact already on disk. Access model is public-by-link
// for now; org-only / expiry is a Phase 3 follow-up.
export async function POST(request: Request): Promise<Response> {
	const form = await request.formData();
	const glb = form.get("glb");
	const jobId = (form.get("jobId") ?? "").toString();

	if (glb instanceof File && glb.size > MAX_GLB_BYTES) {
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

	// Prefer an uploaded GLB; otherwise use the worker's stored artifact.
	const bytes =
		glb instanceof File
			? Buffer.from(await glb.arrayBuffer())
			: await readModel(jobId);
	if (!bytes) {
		return Response.json(
			{ error: "No GLB available to share for this job." },
			{ status: 400 },
		);
	}

	const meta = await createShare({
		jobId,
		title: job.result.modelKey
			? modelLabel(job.result.modelKey)
			: "Reconstruction",
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
