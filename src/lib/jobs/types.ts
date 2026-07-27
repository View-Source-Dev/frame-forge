// Shared job model for the reconstruction pipeline.
//
// A job is the unit of work a designer submits: one product image (+ optional
// notes) that the agent worker turns into a procedural Three.js model over a
// multi-pass review loop. Jobs are minutes long, so the whole product is built
// around "submit and come back" — the UI polls this model, it is never awaited
// inline.

export type JobStatus =
	| "queued"
	| "running"
	| "succeeded"
	// Non-error outcomes are first-class (see TODO cross-cutting concerns):
	// "can't hit that fidelity from one image" is a valid result, not a crash.
	| "needs-input"
	| "failed";

// How a finished (or stopped) job actually turned out. The pipeline is quality
// gated, so "stylized only" / "needs more views" are normal, expected results.
export type JobOutcome =
	| "reconstructed" // hit the fidelity contract
	| "stylized-only" // a faithful-in-spirit stylization, not a detail match
	| "needs-more-views"; // one image couldn't reveal enough geometry

// One iteration of the img2threejs review loop: generate → render → screenshot
// → vision judge. `fidelity` is the AI-vision score for that pass.
export interface ReviewPass {
	pass: number; // 1-indexed
	layer: string; // blockout | structure | form | material | lighting | interaction | optimization
	fidelity: number; // 0..1
	summary: string;
}

export interface JobResult {
	// Legacy stub path: a key into the procedural model registry. `null` for real
	// worker jobs, which deliver a rendered GLB artifact instead.
	modelKey: string | null;
	// True when the worker rendered a GLB artifact to disk (data/jobs/<id>/model.glb),
	// served at /api/jobs/<id>/model and loaded directly by the viewer.
	glb: boolean;
	outcome: JobOutcome;
	finalFidelity: number;
	// What the reconstruction actually cost (real worker only).
	costUsd?: number;
}

export interface Job {
	id: string;
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
	status: JobStatus;
	// The full user-editable reconstruction request shown in the upload form.
	prompt: string;
	image: { name: string; type: string } | null;
	// The full prompt dispatched to the agent (editable request + worker contract).
	dispatchedPrompt: string | null;
	totalPasses: number; // planned review-cycle count for this job
	passes: ReviewPass[]; // grows as the loop runs; drives the progress UI
	result: JobResult | null;
	error: string | null;
}

export function isTerminal(status: JobStatus): boolean {
	return (
		status === "succeeded" || status === "failed" || status === "needs-input"
	);
}
