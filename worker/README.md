# Frame Forge worker

The real reconstruction pipeline, as a **standalone process** decoupled from the
Next app. The app enqueues jobs (writes `data/jobs/<id>/job.json` with
`status: "queued"`); this worker polls for them and processes each:

1. **Agent** — `@anthropic-ai/claude-agent-sdk` runs the `img2threejs` skill
   (Bash → `forge/*.py`) and emits `src/createObjectModel.ts`.
2. **Render + export** — `render-model.mjs` esbuild-bundles that factory with
   three, renders it headless (SwiftShader), and runs `GLTFExporter` to produce
   the **GLB artifact** + a preview PNG. (No model tokens — plain rendering.)
3. Marks the job `succeeded` with the GLB the app serves at `/api/jobs/<id>/model`.

## Prerequisites

- Node 20+.
- `../.env.local` with `ANTHROPIC_API_KEY=…`.
- The [`img2threejs`](https://github.com/hoainho/img2threejs) agent skill
  installed at `~/.claude/skills/img2threejs`. The worker enables it explicitly
  with `skills: ["img2threejs"]`; its `SKILL.md`, `forge/`, and `grimoire/`
  directories are part of the runtime workflow, not optional documentation.
- One-time: `npm install && npx playwright install chromium` (in this dir).

## Run

```bash
cd worker
npm start                # poll loop (processes jobs as they arrive)
node worker.mjs --once   # drain the current queue, then exit
```

## Production

The repository root includes a two-service Docker deployment. The worker image
contains the Agent SDK, Chromium, Python, and a pinned `img2threejs` revision;
the web and worker containers share a durable job/artifact volume:

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production up -d --build
```

See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for health checks, reverse-proxy
requirements, persistence, and scaling limits. The production upload API checks
the worker heartbeat before accepting a job.

Env knobs:
- `WORKER_MODEL` — agent model, default `sonnet`. `haiku` is cheaper still (fine
  for simple objects, riskier on complex ones); `opus` is the most capable/costly.
- `WORKER_MAX_USD` — per-job budget cap, default `2`.

For higher-fidelity output, use `WORKER_MODEL=sonnet` (or `opus`) and consider
raising `WORKER_MAX_USD` to `4`. `haiku` is cost-oriented and is more likely to
settle for coarse primitive geometry. Both values can be placed in
`../.env.local`; explicit shell values override the file.

The generation prompt requires `THREE.DoubleSide` on every mesh material. As a
second guard, `render-model.mjs` traverses the generated model before preview and
GLB export, forces every material instance to `THREE.DoubleSide`, and marks it
for update. This also makes `GLTFExporter` emit `doubleSided: true`.

## Scope / cost (MVP)

Cost-minimal: the agent produces the factory in **one pass — no agent-driven
visual review loop** (that loop is the token sink).

Cost is dominated by **input-token volume** (the skill's reference docs re-read
across turns), not model output. Two levers got a simple object from ~$2.44 down
to **~$0.95** (36 turns, ~4 min):

| Config | Turns | Cost |
| --- | --- | --- |
| Opus, verbose prompt | 45 | $2.44 |
| Sonnet, verbose | 44 | $1.84 |
| **Sonnet + lean prompt** (current) | 36 | **$0.95** |

The lean prompt tells the agent to rely on `SKILL.md` and not open the deep
grimoire docs. Per-job cost is recorded in `result.costUsd` and shown in the UI.
Adding the visual review loop later will increase cost (route only the judging
turns to a stronger model then).

## Not yet wired (next)

- The agent-driven visual review loop (feed rendered screenshots back to the
  agent's vision for `refine-*` passes) — the render tool in `render-model.mjs`
  is already the piece that would supply those screenshots.
- Concurrency (currently one job at a time), retries, GPU autoscaling.
