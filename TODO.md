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

- [ ] **Export the result as `.glb` / `.gltf`.** The skill produces a *procedural* Three.js
      model (code that builds a `THREE.Group` at runtime), so export by running Three.js
      `GLTFExporter` on the instantiated group in the viewer:
  - [ ] "Download GLB" (single binary file) and "Download glTF" (JSON + assets) buttons.
  - [ ] Bake procedural / canvas-generated textures into the export so materials survive the round-trip.
  - [ ] Flag anything that can't export cleanly (custom shaders, non-standard materials) instead of shipping a broken file.
- [ ] **Shareable link under our domain.** From a result, "Share" mints a UUID and a public URL:
      `https://frame-forge.view-source.com/share/${uuid}`.
  - [ ] Persist the result artifact keyed by `uuid` — store the exported **GLB** (the portable form) rather than re-running the pipeline.
  - [ ] `app/share/[uuid]/page.tsx` loads that artifact and renders it in the studio scene.
  - [ ] Decide access model (public link vs. org-only) and whether links expire.

---

## Done ✅

- [x] Scaffold `frame-forge`: Next.js 16, React 19, TypeScript, Tailwind 4, Biome, shadcn (Radix).
- [x] Port the default 3D scene (lighting, camera, stage, controls, contact shadows) into
      `src/components/studio-scene.tsx` — no model picker, no imported meshes, no CSS modules.
- [x] Landing page (`src/app/page.tsx`) stating the Image → Mesh goal, scene as backdrop.
- [x] Verified: `pnpm build` + `pnpm check` clean, renders in browser with no console errors.

---

## Phase 0 — De-risk the two unknowns FIRST (spikes, throwaway code OK)

Everything else is standard web work. These two are the whole ballgame — prove them
in isolation before building any product around them.

- [ ] **Spike A — headless WebGL rendering.** Get a reliable server-side screenshot of a
      Three.js scene (headless Chromium via Playwright/Puppeteer, GPU or SwiftShader).
      Success = a "hello triangle" PNG captured headless on our target infra. If this is
      flaky, the whole review loop is flaky.
- [ ] **Spike B — Agent SDK + skill end-to-end.** Run the Claude Agent SDK headless with
      `img2threejs` installed, Bash enabled (to run `forge/*.py`), and a fixed prompt
      template. Success = one full reconstruction completes and emits `createObjectModel.ts`.
- [ ] Write up findings: does each spike work, how flaky, rough token cost per run.

---

## Phase 1 — Proof of concept

- [ ] Wire Spike A + Spike B together: agent session uses the headless renderer inside its
      review loop (generate → render → screenshot → vision judge → repeat).
- [ ] Fixed prompt template (designers never see it): "reconstruct the object in this image;
      intended use = real-time browser prop; stylization allowed."
- [ ] Run one job at a time, dump the result (`createObjectModel.ts` + comparison sheets) to a folder.
- [ ] View the generated mesh locally by importing it into the existing `studio-scene`.

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

- [ ] Pin `packageManager` in `package.json` to end the pnpm-version ambiguity
      (installs currently need **Node 22 + pnpm 10**; Homebrew's default pnpm 11 errors on Node 20).
- [ ] Decide whether to delete unused create-next-app assets in `public/` (next.svg, vercel.svg, etc.).
