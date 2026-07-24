# Phase 0 Spikes — findings

Throwaway de-risking scripts for the two unknowns in the reconstruction pipeline.
These are **not** wired into the app; they run in isolation with their own deps
(so the app's package manager is untouched):

```bash
cd spikes
npm i playwright @anthropic-ai/claude-agent-sdk
npx playwright install chromium
node spike-a-render.mjs     # no API key needed
node spike-b-agent.mjs      # needs ../.env.local + ~/.claude/skills/img2threejs + ./sample.png
```

Run on: macOS (darwin), Node 20.20, Python 3.11.5, `img2threejs` at `~/.claude/skills/`.

---

## Spike A — headless WebGL screenshot → ✅ PASS

A raw-WebGL "hello triangle" rendered in headless Chromium and captured to PNG
(`evidence/spike-a-out.png`).

- **WebGL works headless** via `--enable-unsafe-swiftshader`. Renderer reported:
  `ANGLE (…SwiftShader Device…)` — i.e. **software rendering, no GPU required**.
  This is the good case for server infra: it works on a plain box, no GPU wrangling.
- **Gotcha (important for the harness): `page.screenshot()` does not reliably
  composite a WebGL canvas headless** — it came back blank (1.6 KB, broken-image
  glyph). Capturing the **canvas directly** (`canvas.toDataURL()` / `gl.readPixels`)
  returns the real image (7.7 KB, correct triangle). The render harness must
  screenshot the canvas, not the page.
- Not flaky across reruns; ~1–2 s per capture.

## Spike B — Agent SDK + img2threejs end-to-end → ✅ PASS

Ran `@anthropic-ai/claude-agent-sdk` v0.3.218 headless, skill loaded, Bash +
file tools enabled, on a simple sample image. Emitted the factory.

| Metric | Value |
| --- | --- |
| `src/createObjectModel.ts` emitted | ✅ yes — 34 KB / 548 lines, real `THREE.Group` factory + `userData.sculptRuntime` rig |
| Other artifacts | `assessment.json`, `object-sculpt-spec.json` |
| Model | `claude-opus-4-8` |
| Turns | 39 (20 Bash, 14 Edit, 1 Skill, 2 Read) |
| Wall time | ~5.5 min (326 s) |
| **Cost** | **~$1.83** |

Confirmed working:
- Auth via `ANTHROPIC_API_KEY` from env. Skill discovery via `settingSources: ["user"]` + `skills: ["img2threejs"]`.
- Headless auto-approval via `permissionMode: "bypassPermissions"`.
- The skill's Python gates ran and **worked as intended**: strict-quality blocked
  a shallow spec (scores must be int 0–3, detail entries need `kind` + `mapsTo.ref`);
  the agent read the skill internals and self-corrected. Good sign for real inputs.
- `maxBudgetUsd` / `maxTurns` caps are respected.

### ⚠️ The headline finding: cost

**$1.83 was a *simple* object and did NOT include the visual review loop.** The real
pipeline adds 5–8 render→screenshot→vision-judge cycles on top. So a realistic
per-object cost is **materially higher than $2** — the current per-job cap is too
low to finish a real reconstruction. Options to decide before Phase 1:

- Raise the cap (e.g. $5–8/object) and surface cost per job.
- Cheaper model for the mechanical stages (intake/spec edits), Opus only for vision judging.
- Prompt-cache the skill docs (they're re-read a lot) and tighten the fixed prompt.

## Next (Phase 1): wire A + B together

Give the Spike-B agent a **render tool** built from Spike A (bundle the emitted
`createObjectModel.ts` with three + a canvas-capture harness → return PNG to the
agent's vision). Then the review loop closes. After the final pass, run
`GLTFExporter` in that same headless page to produce the **GLB artifact** (the
agreed worker-side export), and stream `append_review.py` args into `job.json`.
