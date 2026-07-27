import { createJob, listJobs } from "@/lib/jobs/store";
import { DEFAULT_RECONSTRUCTION_PROMPT } from "@/lib/prompt";
import { startJob } from "@/lib/worker/run-job";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB
// Review cycles per job. Real runs are 5–8 image-dependent cycles; the stub
// uses a fixed count.
const TOTAL_PASSES = 7;

// POST /api/jobs — create a reconstruction job from an uploaded image (+ notes)
// and kick off the worker. Returns immediately; the job runs in the background
// and the client polls GET /api/jobs/[id].
export async function POST(request: Request): Promise<Response> {
	const form = await request.formData();
	const image = form.get("image");
	const submittedPrompt = (form.get("prompt") ?? "").toString().trim();
	const prompt = submittedPrompt || DEFAULT_RECONSTRUCTION_PROMPT;

	if (!(image instanceof File)) {
		return Response.json(
			{ error: "An image file is required." },
			{ status: 400 },
		);
	}
	if (!image.type.startsWith("image/")) {
		return Response.json(
			{ error: "Uploaded file must be an image." },
			{ status: 400 },
		);
	}
	if (image.size > MAX_IMAGE_BYTES) {
		return Response.json(
			{ error: "Image exceeds the 12 MB limit." },
			{ status: 413 },
		);
	}

	const bytes = Buffer.from(await image.arrayBuffer());
	const job = await createJob({
		prompt,
		imageBytes: bytes,
		imageName: image.name || "reference",
		imageType: image.type,
		totalPasses: TOTAL_PASSES,
	});

	// Real jobs are picked up by the standalone worker (worker/worker.mjs), which
	// polls for `queued` jobs. Set FORGE_USE_STUB=1 to instead run the in-process
	// simulated worker (demo without an API key / without the worker running).
	if (process.env.FORGE_USE_STUB === "1") startJob(job.id);
	return Response.json(job, { status: 201 });
}

// GET /api/jobs — list jobs, newest first (the "come back later" surface).
export async function GET(): Promise<Response> {
	return Response.json(await listJobs());
}
