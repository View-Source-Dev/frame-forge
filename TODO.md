# Frame Forge — TODO

**Goal:** a website that lets our designers upload a product design (+ a few prompts)
and get a 3D result back — by wiring a Claude agent to the `img2threejs` skill with
default prompts, so the designer never touches the CLI or the prompt.

**Key constraint to remember:** `img2threejs` is **not** a one-shot function. It's a
long-running **agentic loop** that generates Three.js code, *renders it in a browser*,
screenshots it, and has Claude's vision grade the render against the reference — for
**5–8 cycles**. ~80–180k tokens and several minutes per object (150–350k for characters).
The whole architecture follows from that one fact.

---

## Core features (must-have)

Beyond the reconstruction pipeline itself, the product must ship these:

- [x] **Export the result as `.glb` / `.gltf`.** The skill produces a *procedural* Three.js
      model (code that builds a `THREE.Group` at runtime), so export by running Three.js
      `GLTFExporter` on the instantiated group in the viewer:
  - [x] "Download GLB" (single binary file) and "Download glTF" (JSON + assets) buttons.
        (`src/lib/export/gltf.ts`, wired in `src/components/model-viewer.tsx`.)
  - [x] Bake procedural / canvas-generated textures into the export so materials survive the round-trip.
        (Verified: the gift box's canvas wrapping texture survives GLB → share → GLTFLoader reload.)
  - [x] Flag anything that can't export cleanly (custom shaders, non-standard materials) instead of shipping a broken file.
        (`checkExportable` surfaces a warning banner before download.)
- [x] **Shareable link under our domain.** From a result, "Share" mints a UUID and a public URL.
      (Currently `${origin}/share/${uuid}`; swap `origin` for `frame-forge.view-source.com` when deployed.)
  - [x] Persist the result artifact keyed by `uuid` — store the exported **GLB** (the portable form) rather than re-running the pipeline.
        (`src/lib/shares/store.ts`; the client exports the GLB and POSTs it to `/api/share`.)
  - [x] `app/share/[uuid]/page.tsx` loads that artifact and renders it in the studio scene (via `GLTFLoader`, source-independent).
  - [ ] Decide access model (public link vs. org-only) and whether links expire. (Currently public-by-link; deferred to Phase 3 auth.)

---

## Done ✅

- [x] Scaffold `frame-forge`: Next.js 16, React 19, TypeScript, Tailwind 4, Biome, shadcn (Radix).
- [x] Port the default 3D scene (lighting, camera, stage, controls, contact shadows) into
      `src/components/studio-scene.tsx` — no model picker, no imported meshes, no CSS modules.
- [x] Landing page (`src/app/page.tsx`) stating the Image → Mesh goal, scene as backdrop.
- [x] Verified: `pnpm build` + `pnpm check` clean, renders in browser with no console errors.

### Product shell + Core features (this session)

The full designer-facing vertical slice, built around a **stubbed worker seam** so it runs
and is verifiable today. The real Agent-SDK + headless-render worker (Phase 0/1) drops into
`src/lib/worker/run-job.ts` without touching anything above it.

- [x] **Upload UI** — `src/app/studio/page.tsx` + `src/components/upload-form.tsx`
      (drag/drop image + optional notes; the fixed prompt is applied server-side in `src/lib/prompt.ts`).
- [x] **Job model + filesystem store + API** — `src/lib/jobs/*`, `src/app/api/jobs/*`.
      Each job gets an isolated workspace at `data/jobs/<id>/`.
- [x] **Background worker (STUB)** — `src/lib/worker/run-job.ts` simulates the 5–8-pass review
      loop (rising fidelity, first-class `stylized-only` / `needs-more-views` outcomes) and emits
      a procedural model key. Runs async; the page polls. **Not** the real agent yet.
- [x] **Progress streaming** — `src/components/job-monitor.tsx` polls and shows pass N/total,
      per-pass fidelity, and a live review timeline ("submit & come back" UX).
- [x] **Result viewer** — reuses the studio scene (`studio-scene.tsx` now takes a subject slot);
      procedural factories in `src/lib/models/*` stand in for the skill's `createObjectModel.ts`.
- [x] **GLB / glTF export** + **Share link** + `/share/[uuid]` (see Core features above).
- [x] Verified end-to-end: `next build` + `biome check` clean; upload → 7-pass run → 3D result
      → Share → public GLB reload all exercised in-browser.
- [ ] Support a few concurrent jobs (small worker pool) — real worker concern, deferred.

> Note: lucide-react v1.26 in this repo has a malformed directive order (`"use strict"` before
> `"use client"`) that crashes RSC. Icons for server components are routed through the
> `src/components/icons.tsx` client boundary; `ui/button.tsx` gained `"use client"` for the same reason.

---

## Phase 0 — De-risk the two unknowns FIRST (spikes, throwaway code OK)

Everything else is standard web work. These two are the whole ballgame — prove them
in isolation before building any product around them.

- [x] **Spike A — headless WebGL rendering.** ✅ PASS. `spikes/spike-a-render.mjs` captures a
      hello-triangle PNG in headless Chromium via **SwiftShader/ANGLE (software, no GPU)** with
      `--enable-unsafe-swiftshader`. Key gotcha: `page.screenshot()` does not composite the WebGL
      canvas headless — capture the **canvas** (`toDataURL`/`readPixels`). Not flaky.
- [x] **Spike B — Agent SDK + skill end-to-end.** ✅ PASS. `spikes/spike-b-agent.mjs` ran
      `@anthropic-ai/claude-agent-sdk` headless with `img2threejs` + Bash; emitted a 548-line
      `createObjectModel.ts` (+ assessment.json + spec). Auth via `ANTHROPIC_API_KEY`; skill via
      `settingSources:["user"]` + `skills:["img2threejs"]`; `permissionMode:"bypassPermissions"`.
      The skill's Python quality gates ran and the agent self-corrected against them.
- [x] Write up findings: see `spikes/README.md`. **⚠️ Cost: ~$1.83 for a *simple* object WITHOUT
      the render loop (39 turns, ~5.5 min). Real objects + 5–8 review cycles will exceed the $2/job
      cap — revisit budget (raise cap, cheaper model for mechanical stages, prompt-cache skill docs).**

---

## Phase 1 — Proof of concept

Real pipeline shipped as a standalone process in `worker/` (see `worker/README.md`).
Verified end-to-end: uploaded image → agent emits `createObjectModel.ts` → headless
render → **GLB artifact** → viewer + share, all in-browser.

Cost optimized from **$2.44 → $0.95** per simple object: switch the agent to Sonnet
(`WORKER_MODEL`, default) + a lean prompt that skips the deep grimoire docs (input
tokens are the dominant cost, not output). `WORKER_MAX_USD` caps per-job spend (default $2).

- [~] Wire Spike A + Spike B together. **MVP done WITHOUT the agent-driven review loop**
      (the token sink): the agent produces the factory one-shot, then the worker
      *deterministically* renders + exports the GLB (`worker/render-model.mjs`). Closing the
      loop (feed screenshots back to the agent's vision for `refine-*` passes) is the next step —
      the render tool that would supply those screenshots already exists.
- [x] Fixed prompt template (designers never see it) — `src/lib/prompt.ts`, re-inlined in the worker.
- [x] Run one job at a time; result artifacts land in `data/jobs/<id>/` (`workspace/` with
      `createObjectModel.ts` + spec/assessment, plus `model.glb` + `preview.png`).
- [x] View the generated mesh: served at `/api/jobs/<id>/model`, rendered in the studio scene.

## Phase 2 — Usable internal tool

- [ ] Upload UI: designer uploads a product image + optional prompt notes.
- [ ] Job queue + worker: upload → queued → worker runs the agent session → deliver artifact.
      (Synchronous "wait on the page" won't work — jobs are minutes long.)
- [ ] Each job gets an isolated workspace (assessment.json, spec, generated code, sheets).
- [ ] Progress streaming to the UI ("pass 3 of 7, fidelity 0.72"); UX is "submit & come back."
- [ ] Result viewer: orbit the generated mesh in a Three.js canvas + show the comparison sheets.
- [ ] **GLB / glTF export** in the viewer (see Core features).
- [ ] **Share link** + artifact persistence at `/share/${uuid}` (see Core features).
- [ ] Handle non-error outcomes as first-class: "needs more views" / "stylized only" are normal.
- [ ] Support a few concurrent jobs (small worker pool).

## Phase 3 — Robust product (later)

- [ ] Auth for designers.
- [ ] Per-job token budget cap (cost scales with review-cycle count → image messiness).
- [ ] Retries, GPU autoscaling, result versioning, review history.

---

## Cross-cutting concerns (decided during discussion)

- [ ] **Cost control:** dominated by review-cycle count. Enforce a per-job token budget cap.
      Clean, single-object images on plain backgrounds are far cheaper than characters/busy scenes.
- [ ] **Latency:** minutes, not seconds. Design every UI around "submit and come back."
- [ ] **Non-determinism:** quality-gated; sometimes the honest result is "can't hit that fidelity
      from one image." Treat it as a valid outcome, not a failure.

## Locked decisions

- **JS vs TS output:** the skill emits **TypeScript for free** (deterministic Python subprocess,
  ~0 model tokens). Keep the generated `.ts` and let the bundler strip types → same token cost as
  a TS project, and we keep the near-free `typecheck` gate that catches errors before the expensive
  render loop. **Do NOT** make the agent convert TS→JS in-loop (re-stripping every pass = wasted tokens).
- **Primitives:** Radix (via shadcn), not shadcn's new Base UI default.

## Toolchain follow-ups

- [x] Pin `packageManager` in `package.json` to end the pnpm-version ambiguity. **Fixed:**
      pinned `pnpm@10.34.5` (engines `node >=18.12`, so it runs on this repo's Node 20). The
      failure was Homebrew's global **pnpm 11** (needs Node 22.13). Corepack now serves the
      pinned version — **one-time per machine: `corepack enable pnpm`** — so `pnpm dev` works
      on Node 20 without touching Node or Homebrew. Verified: `pnpm dev` boots Next 16 on :3000.
- [ ] Decide whether to delete unused create-next-app assets in `public/` (next.svg, vercel.svg, etc.).
