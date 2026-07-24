// Frame Forge reconstruction worker (real pipeline).
//
// Standalone process, decoupled from the Next app: it polls the shared
// filesystem job store (data/jobs/<id>/job.json) for `queued` jobs and processes
// each one:
//   1. Agent SDK runs the img2threejs skill → emits src/createObjectModel.ts.
//      (Cost-minimal MVP: no agent-driven visual review loop — that's the token
//      sink. We stream the skill's pipeline stages into the job for progress.)
//   2. render-model.mjs renders that factory headless and exports the GLB
//      artifact (worker-side export) + a preview PNG. No extra tokens.
//   3. The job is marked succeeded with a GLB artifact the app serves.
//
// Run:  cd worker && npm start            (loops, polling)
//       cd worker && node worker.mjs --once   (drain queue then exit)
//
// Requires ../.env.local with ANTHROPIC_API_KEY and the img2threejs skill at
// ~/.claude/skills/img2threejs.

import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { renderAndExport } from "./render-model.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const JOBS_DIR = path.join(ROOT, "data", "jobs");
const MAX_USD = Number(process.env.WORKER_MAX_USD ?? 2);
// Cost lever: the MVP has no vision-review step, so every stage is mechanical
// (run scripts, edit JSON, generate code) — a cheaper model handles it fine and
// cuts cost ~5x vs Opus. When the vision-review loop is added later, route only
// the judging turns to a stronger model.
const MODEL = process.env.WORKER_MODEL ?? "sonnet";
const ONCE = process.argv.includes("--once");

// --- Load ANTHROPIC_API_KEY from ../.env.local (value never logged) ----------
const ENV_LOCAL = path.join(ROOT, ".env.local");
if (existsSync(ENV_LOCAL)) {
	for (const line of readFileSync(ENV_LOCAL, "utf8").split("\n")) {
		const m = line.match(/^\s*(?:export\s+)?ANTHROPIC_API_KEY\s*=\s*(.*)\s*$/);
		if (m)
			process.env.ANTHROPIC_API_KEY = m[1].replace(/^["']|["']$/g, "").trim();
	}
}
if (!process.env.ANTHROPIC_API_KEY) {
	console.error(
		"[worker] ANTHROPIC_API_KEY not set (need ../.env.local). Exiting.",
	);
	process.exit(2);
}

// --- Minimal job store (matches the app's src/lib/jobs schema) ----------------
const jobFile = (id) => path.join(JOBS_DIR, id, "job.json");
const readJob = (id) => JSON.parse(readFileSync(jobFile(id), "utf8"));
function writeJob(job) {
	job.updatedAt = new Date().toISOString();
	writeFileSync(jobFile(job.id), JSON.stringify(job, null, 2));
}
function listQueued() {
	if (!existsSync(JOBS_DIR)) return [];
	const out = [];
	for (const id of readdirSync(JOBS_DIR)) {
		try {
			const job = readJob(id);
			if (job.status === "queued") out.push(job);
		} catch {}
	}
	return out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// Same fixed prompt the app records (src/lib/prompt.ts), inlined here.
function buildPrompt(notes) {
	const base = `Reconstruct the object visible in the attached reference image (./reference file
in this working directory) as a procedural Three.js model using the img2threejs skill.

Constraints for this run:
- Intended use: real-time browser prop with interactive performance.
- Stylization is allowed when a single image cannot reveal hidden geometry.
- You do NOT have a browser/renderer here, so do NOT render, screenshot, or run
  the visual review loop — rendering + GLB export happen separately.
- Run the skill's intake + assessment + spec steps (its forge/*.py scripts), then
  generate the factory to ./src/createObjectModel.ts. Stop once that file exists.

Work efficiently to keep cost down (this dominates spend):
- Rely on the skill's SKILL.md. Do NOT open the deep grimoire/*.md reference
  docs unless a script error actually forces you to.
- Read each file at most once; don't re-read what's already in context.
- Produce the *minimum* spec that passes validation for the blockout pass — do
  not over-fill later-pass detail.
Known gate requirements (fill these in up front so validation passes first try):
- Assessment/spec scores are integers 0–3.
- Each detailInventory entry needs a valid \`kind\` and a \`mapsTo.ref\` pointing at
  a real component or material id.
- The generator gates per pass; for the blockout pass only satisfy pass-1 needs.`;
	const n = (notes ?? "").trim();
	return n ? `${base}\n\nDesigner notes: ${n}` : base;
}

const extFor = (mime) =>
	mime === "image/jpeg" || mime === "image/jpg"
		? "jpg"
		: mime === "image/webp"
			? "webp"
			: "png";

// Map a Bash command to the skill pipeline stage it represents.
const STAGES = [
	["intake", /probe_image/],
	["assessment", /new_pre_spec_assessment/],
	["spec", /new_sculpt_spec|validate_sculpt_spec/],
	["generate", /generate_threejs_factory/],
];
const STAGE_SUMMARY = {
	intake: "Validated the reference image as a 3D target.",
	assessment: "Classified object + wrote the quality contract.",
	spec: "Authored and validated the sculpt spec.",
	generate: "Generated the procedural factory (blockout pass).",
	render: "Rendered the model and exported the GLB artifact.",
};
const TOTAL_STAGES = STAGES.length + 1; // + render/export

async function processJob(job) {
	console.log(`[worker] processing ${job.id}`);
	job.status = "running";
	job.totalPasses = TOTAL_STAGES;
	job.passes = [];
	job.dispatchedPrompt = buildPrompt(job.prompt);
	writeJob(job);

	// Workspace + reference image the agent can read.
	const workspace = path.join(JOBS_DIR, job.id, "workspace");
	mkdirSync(path.join(workspace, "src"), { recursive: true });
	const ext = extFor(job.image?.type ?? "image/png");
	copyFileSync(
		path.join(JOBS_DIR, job.id, "reference"),
		path.join(workspace, `reference.${ext}`),
	);

	const seen = new Set();
	const addStage = (stage) => {
		if (seen.has(stage)) return;
		seen.add(stage);
		job.passes.push({
			pass: job.passes.length + 1,
			layer: stage,
			fidelity: 0, // no vision score in the cost-minimal MVP
			summary: STAGE_SUMMARY[stage] ?? stage,
		});
		writeJob(job);
	};

	let costUsd = 0;
	for await (const msg of query({
		prompt: buildPrompt(job.prompt),
		options: {
			cwd: workspace,
			model: MODEL,
			settingSources: ["user"],
			skills: ["img2threejs"],
			permissionMode: "bypassPermissions",
			maxBudgetUsd: MAX_USD,
			maxTurns: 80,
		},
	})) {
		if (msg.type === "assistant") {
			for (const block of msg.message.content ?? []) {
				if (block.type === "tool_use" && block.name === "Bash") {
					const cmd = String(block.input?.command ?? "");
					for (const [stage, re] of STAGES) if (re.test(cmd)) addStage(stage);
				}
			}
		} else if (msg.type === "result") {
			costUsd = msg.total_cost_usd ?? 0;
			console.log(
				`[worker] agent done: ${msg.subtype} · ${msg.num_turns} turns · $${costUsd.toFixed(2)}`,
			);
		}
	}

	const factory = path.join(workspace, "src", "createObjectModel.ts");
	if (!existsSync(factory)) {
		throw new Error(
			"agent did not emit src/createObjectModel.ts (may have hit the budget cap)",
		);
	}

	// Deterministic render + GLB export (no tokens).
	addStage("render");
	const { glb, preview } = await renderAndExport({ workspaceDir: workspace });
	writeFileSync(path.join(JOBS_DIR, job.id, "model.glb"), glb);
	writeFileSync(path.join(JOBS_DIR, job.id, "preview.png"), preview);

	job.status = "succeeded";
	job.result = {
		modelKey: null,
		glb: true,
		outcome: "reconstructed",
		finalFidelity: 0,
		costUsd,
	};
	writeJob(job);
	console.log(
		`[worker] ✅ ${job.id} → GLB ${(glb.length / 1024).toFixed(0)} KB · $${costUsd.toFixed(2)}`,
	);
}

async function tick() {
	for (const job of listQueued()) {
		try {
			await processJob(job);
		} catch (err) {
			console.error(`[worker] ✗ ${job.id}:`, err?.message ?? err);
			try {
				const j = readJob(job.id);
				j.status = "failed";
				j.error = err instanceof Error ? err.message : String(err);
				writeJob(j);
			} catch {}
		}
	}
}

console.log(
	`[worker] started · model ${MODEL} · budget $${MAX_USD}/job · jobs dir ${JOBS_DIR}${ONCE ? " · --once" : ""}`,
);
if (ONCE) {
	await tick();
	console.log("[worker] queue drained, exiting (--once).");
} else {
	// Simple poll loop.
	for (;;) {
		await tick();
		await new Promise((r) => setTimeout(r, 3000));
	}
}
