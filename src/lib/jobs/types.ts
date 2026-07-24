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
	// Key into the procedural model registry. Stands in for the skill's real
	// output artifact (`createObjectModel.ts`) — see src/lib/models/registry.ts.
	modelKey: string;
	outcome: JobOutcome;
	finalFidelity: number;
}

export interface Job {
	id: string;
	createdAt: string; // ISO 8601
	updatedAt: string; // ISO 8601
	status: JobStatus;
	// The designer's optional notes. NOT the fixed reconstruction prompt — that
	// template lives server-side in src/lib/prompt.ts and designers never see it.
	prompt: string;
	image: { name: string; type: string } | null;
	// The full prompt actually dispatched to the agent (fixed template + notes).
	// An internal audit trail — not surfaced in the designer-facing UI.
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
