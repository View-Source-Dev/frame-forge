// Spike B — Claude Agent SDK + img2threejs end-to-end (throwaway de-risking).
// Success (per TODO) = one reconstruction run emits src/createObjectModel.ts.
//
// Scope: proves the SDK loads the skill, runs its forge/*.py via Bash, and emits
// the procedural factory. It deliberately does NOT run the visual review loop —
// no renderer is wired here (Spike A already proved headless WebGL; wiring them
// together is Phase 1). That scoping also keeps the run cheaper.
//
// Run (isolated, does NOT use the app's deps):
//   cd spikes && npm i @anthropic-ai/claude-agent-sdk
//   #   requires ../.env.local with ANTHROPIC_API_KEY=...
//   #   requires the img2threejs skill installed at ~/.claude/skills/img2threejs
//   #   put a simple product image at ./sample.png
//   node spike-b-agent.mjs
//
// FINDINGS (see README.md): PASS. Emitted a 548-line createObjectModel.ts plus
// assessment.json + object-sculpt-spec.json. 39 turns, ~5.5 min, ~$1.83 — and
// that was a SIMPLE object WITHOUT the render loop. Budget planning must account
// for the review cycles adding materially on top of this.

import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
} from "node:fs";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";

const HERE = path.dirname(new URL(import.meta.url).pathname);

// Load ANTHROPIC_API_KEY from ../.env.local (value never logged).
const ENV_LOCAL = path.join(HERE, "..", ".env.local");
for (const line of readFileSync(ENV_LOCAL, "utf8").split("\n")) {
	const m = line.match(/^\s*(?:export\s+)?ANTHROPIC_API_KEY\s*=\s*(.*)\s*$/);
	if (m)
		process.env.ANTHROPIC_API_KEY = m[1].replace(/^["']|["']$/g, "").trim();
}
if (!process.env.ANTHROPIC_API_KEY) {
	console.error("ANTHROPIC_API_KEY not found in ../.env.local");
	process.exit(2);
}

const WORKSPACE = path.join(HERE, "spike-b-workspace");
mkdirSync(WORKSPACE, { recursive: true });
copyFileSync(
	path.join(HERE, "sample.png"),
	path.join(WORKSPACE, "reference.png"),
);

const PROMPT = `Use the img2threejs skill to reconstruct the object in ./reference.png
as a procedural Three.js model.

IMPORTANT constraints for this run:
- You do NOT have a browser or renderer available here, so do NOT attempt to
  render, screenshot, or run the visual review loop — that is wired separately.
- Run the skill's intake + assessment + spec steps (its forge/*.py scripts),
  then generate the initial blockout-pass factory to ./src/createObjectModel.ts.
- Intended use: real-time browser prop. Stylization is allowed.
- Stop once ./src/createObjectModel.ts exists. Keep it tight to stay in budget.`;

const start = Date.now();
const toolCalls = [];

async function run() {
	for await (const msg of query({
		prompt: PROMPT,
		options: {
			cwd: WORKSPACE,
			settingSources: ["user"], // discover ~/.claude/skills/img2threejs
			skills: ["img2threejs"],
			permissionMode: "bypassPermissions", // headless: auto-approve tools
			maxBudgetUsd: 2,
			maxTurns: 80,
		},
	})) {
		if (msg.type === "system" && msg.subtype === "init") {
			console.log(
				`[init] session ${msg.session_id?.slice(0, 8)} · model ${msg.model ?? "?"}`,
			);
		} else if (msg.type === "assistant") {
			for (const block of msg.message.content ?? []) {
				if (block.type === "text" && block.text.trim()) {
					console.log(
						`[say] ${block.text.trim().slice(0, 140).replace(/\n/g, " ")}`,
					);
				} else if (block.type === "tool_use") {
					toolCalls.push(block.name);
					const brief =
						block.name === "Bash"
							? String(block.input?.command ?? "").slice(0, 90)
							: JSON.stringify(block.input ?? {}).slice(0, 90);
					console.log(`[tool] ${block.name}: ${brief}`);
				}
			}
		} else if (msg.type === "result") {
			const factory = path.join(WORKSPACE, "src", "createObjectModel.ts");
			const emitted = existsSync(factory);
			console.log("\n=== SPIKE B RESULT ===");
			console.log(
				JSON.stringify(
					{
						subtype: msg.subtype,
						createObjectModelEmitted: emitted,
						factoryBytes: emitted ? statSync(factory).size : 0,
						workspaceFiles: listFiles(WORKSPACE).slice(0, 40),
						toolCallCounts: tally(toolCalls),
						num_turns: msg.num_turns,
						total_cost_usd: msg.total_cost_usd,
						wallSeconds: Math.round((Date.now() - start) / 1000),
						verdict: emitted ? "PASS" : "INCOMPLETE",
					},
					null,
					2,
				),
			);
			process.exit(emitted ? 0 : 1);
		}
	}
}

function listFiles(dir, base = dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		if (name === "node_modules" || name === ".git") continue;
		const full = path.join(dir, name);
		if (statSync(full).isDirectory()) out.push(...listFiles(full, base));
		else out.push(path.relative(base, full));
	}
	return out;
}
function tally(arr) {
	const out = {};
	for (const k of arr) out[k] = (out[k] ?? 0) + 1;
	return out;
}

run().catch((err) => {
	console.error("Spike B crashed:", err?.message ?? err);
	process.exit(2);
});
