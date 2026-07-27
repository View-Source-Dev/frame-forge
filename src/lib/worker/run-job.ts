// ┌───────────────────────────────────────────────────────────────────────────┐
// │  STUB WORKER — this is the seam where the real pipeline plugs in.           │
// └───────────────────────────────────────────────────────────────────────────┘
//
// The real worker (TODO Phase 0/1) is a long-running agentic loop:
//
//   1. Spawn the Claude Agent SDK headless with the `img2threejs` skill
//      installed and Bash enabled (to run the skill's `forge/*.py` scripts).
//   2. Feed it buildPrompt(job.prompt) + the uploaded reference image.
//   3. The agent runs generate → render (headless Chromium / WebGL) →
//      screenshot → vision-judge for 5–8 cycles, emitting `createObjectModel.ts`.
//   4. On each cycle, stream the pass/fidelity back into the job so the UI
//      can show "pass 3 of 7, fidelity 0.72".
//
// That worker needs an API key, a headless-GPU host, and minutes per job — none
// of which exist in this environment — so it is NOT implemented here. Instead,
// this stub simulates the SHAPE of the loop (timing, rising fidelity, a final
// outcome) and resolves to a procedural model from the local registry, so the
// entire product (upload → poll → view → export → share) runs end-to-end today.
//
// Everything above this function stays identical when the real worker lands;
// only the body of `runJob` changes. Server-only.

import { updateJob } from "@/lib/jobs/store";
import type { JobOutcome, ReviewPass } from "@/lib/jobs/types";
import { MODEL_KEYS } from "@/lib/models/registry";
import { buildPrompt } from "@/lib/prompt";

// Real passes are minutes long; the stub compresses them so a demo run finishes
// in seconds. Overridable so a reviewer can slow it down to watch the UI.
const PASS_MS = Number(process.env.FORGE_STUB_PASS_MS ?? 1400);

// The img2threejs build passes, in order.
const LAYERS = [
	"blockout",
	"structure",
	"form",
	"material",
	"lighting",
	"interaction",
	"optimization",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Deterministic per-job pseudo-value in [0,1) from the id, so a given job always
// replays the same fidelity curve / model choice (no Math.random needed).
function seed(id: string): number {
	let h = 2166136261;
	for (let i = 0; i < id.length; i++) {
		h ^= id.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return ((h >>> 0) % 1000) / 1000;
}

// In-process guard so a double POST (or a fast refresh) can't start two loops
// for the same job. Not durable — a real queue would own this.
const running = new Set<string>();

export function startJob(id: string): void {
	if (running.has(id)) return;
	running.add(id);
	void runJob(id).finally(() => running.delete(id));
}

async function runJob(id: string): Promise<void> {
	try {
		const job = await updateJob(id, (j) => {
			j.status = "running";
			// The prompt the real agent session would receive. In the stub it is
			// only recorded (audit trail); the real worker passes it to the SDK.
			j.dispatchedPrompt = buildPrompt(j.prompt);
		});
		if (!job) return;

		const s = seed(id);
		const totalPasses = job.totalPasses;

		for (let pass = 1; pass <= totalPasses; pass++) {
			await sleep(PASS_MS);
			const progress = pass / totalPasses;
			// Fidelity climbs and decelerates toward a per-job ceiling — the honest
			// shape of an iterative review loop chasing a quality contract.
			const ceiling = 0.72 + s * 0.24; // 0.72–0.96
			const fidelity = round(0.34 + (ceiling - 0.34) * easeOut(progress));
			const entry: ReviewPass = {
				pass,
				layer: LAYERS[Math.min(pass - 1, LAYERS.length - 1)],
				fidelity,
				summary: passSummary(pass, totalPasses, fidelity),
			};
			await updateJob(id, (j) => {
				j.passes.push(entry);
			});
		}

		const finalFidelity =
			job.passes.length > 0
				? job.passes[job.passes.length - 1].fidelity
				: round(0.34 + (0.72 + s * 0.24 - 0.34));
		const ceiling = round(0.72 + s * 0.24);
		const { outcome, status } = classify(ceiling);
		const modelKey =
			MODEL_KEYS[Math.floor(s * MODEL_KEYS.length) % MODEL_KEYS.length];

		await updateJob(id, (j) => {
			j.status = status;
			j.result = {
				modelKey,
				glb: false,
				outcome,
				finalFidelity: ceiling || finalFidelity,
			};
		});
	} catch (err) {
		await updateJob(id, (j) => {
			j.status = "failed";
			j.error = err instanceof Error ? err.message : String(err);
		});
	}
}

function classify(ceiling: number): {
	outcome: JobOutcome;
	status: "succeeded" | "needs-input";
} {
	if (ceiling >= 0.8) return { outcome: "reconstructed", status: "succeeded" };
	if (ceiling >= 0.7) return { outcome: "stylized-only", status: "succeeded" };
	// A single image just didn't reveal enough — a valid, non-error result.
	return { outcome: "needs-more-views", status: "needs-input" };
}

function passSummary(pass: number, total: number, fidelity: number): string {
	if (pass === 1) return "Blockout massed; primary silhouette locked.";
	if (pass === total)
		return `Final review — vision fidelity ${fidelity.toFixed(2)} against reference.`;
	return `Refined ${LAYERS[Math.min(pass - 1, LAYERS.length - 1)]}; fidelity ${fidelity.toFixed(2)}.`;
}

const round = (n: number) => Math.round(n * 100) / 100;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
