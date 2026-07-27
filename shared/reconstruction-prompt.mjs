export const DEFAULT_RECONSTRUCTION_PROMPT = `Use the /img2threejs skill to reconstruct the object visible in the attached reference image as a procedural Three.js model.

Treat the image as the visual source of truth:
- Intended use: a real-time browser prop with interactive performance.
- Quality target: maximize perceptual and structural similarity to the supplied image. Deliver a high-fidelity production model, not a blockout, placeholder, generic substitute, or primitive-only approximation.
- Preserve the primary silhouette, exact visible proportions, relative part placement, viewing angles, colour palette, graphic markings, material character, and every identity-defining detail supported by the evidence.
- Treat detailed user notes as additional design constraints. When the input is an information-rich product design sheet, use every legible view, callout, dimension, section, material label, colour swatch, exploded relationship, and functional annotation instead of simplifying to the most obvious view.
- Reconcile multiple views into one coherent 3D structure. Match orthographic front/side/top relationships and perspective views consistently; do not model each view as an unrelated facade.
- Before code generation, create a reference-specific evidence checklist from macro forms through micro details. Map every supported item to an actual component, geometry feature, material, texture, or marking, and do not stop with unmapped high-confidence evidence.
- Decompose the subject into its visible macro forms, secondary structures, tertiary features, and small identity details. A single box or a few unmodified primitives are not an acceptable final result unless the reference truly is that simple.
- Use appropriate geometry for each form: bevels and rounded edges, tapered or curved profiles, extrusions, tubes, lathed parts, repeated elements, and layered surfaces where the reference requires them.
- Reproduce visible joins, thickness, insets, cut-outs, handles, fasteners, seams, trim, controls, and surface variation instead of flattening them into textures or ignoring them.
- Reproduce logos, labels, panel lines, decals, patterns, and other graphic identity cues with generated geometry or procedural/canvas textures when they materially affect likeness.
- Use differentiated PBR materials with plausible roughness, metalness, clearcoat, transmission, emissive, and texture treatment based on visible evidence. Project policy: every generated mesh material must explicitly use the case-sensitive Three.js setting \`side: THREE.DoubleSide\`; do not leave it at the default \`THREE.FrontSide\` or use \`THREE.BackSide\`.
- Build closed, properly thickened solids with coherent normals wherever the design represents a volume. Double-sided rendering is a safety requirement, not a substitute for missing back faces, zero-thickness geometry, or broken topology.
- Follow the skill's intake, pre-spec assessment, detail inventory, sculpt-spec, strict-validation, and staged generation workflow.
- Build with TypeScript and plain Three.js, returning an animation-ready THREE.Group with the runtime hierarchy exposed through root.userData.sculptRuntime.
- Infer hidden geometry conservatively. Stylization is acceptable when a single image cannot reveal exact geometry, but do not invent false precision.
- If the reference is unsuitable or important geometry cannot be inferred reliably, state the limitation and request the additional views that would unblock reconstruction.`;

const WORKER_EXECUTION_CONTRACT = `Worker execution contract:
- Invoke the enabled img2threejs skill. The reference image is the ./reference file in the current working directory.
- Complete intake, assessment, a reference-specific detail inventory, sculpt-spec authoring, strict validation, and factory generation.
- This worker renders and exports separately. Do not open a browser, render screenshots, or run the visual-review loop in the agent session.
- The pass-gated generator may initially emit a blockout scaffold. Do not treat that scaffold as the final deliverable: continue by directly refining ./src/createObjectModel.ts through structure, form, material, surface-detail, and interaction quality before stopping.
- Do not finish merely because ./src/createObjectModel.ts exists. Finish only when its rendered geometry would be recognizably specific to the reference rather than a generic box-based stand-in.
- Use all reliable visual and written evidence provided for the job. Rich input should produce correspondingly richer geometry and materials; do not discard usable design-sheet information for the sake of a shorter implementation.
- Before stopping, inspect the complete factory against this checklist: reference-specific silhouette; cross-view proportion consistency; multi-part component hierarchy; non-placeholder geometry; bevels/curves where visible; distinct materials; mapped identity details and markings; grounded attachments; sensible pivots/sockets; no floating parts.
- Audit every material construction, fallback material, cloned material, and material array. Set each material instance to \`THREE.DoubleSide\` and \`needsUpdate = true\`; the final factory must contain no intentional \`THREE.FrontSide\` or \`THREE.BackSide\` mesh material.
- Work efficiently: rely on SKILL.md and only open deeper grimoire references when the subject or a script error requires them. Read each file at most once.
- Assessment and spec scores must be integers from 0 to 3.
- Every detailInventory entry must have a valid kind and mapsTo.ref pointing to a real component or material id.
- Spend the available budget on visible likeness and geometry quality; avoid verbose narration, repeated file reads, and speculative documentation searches.`;

export function buildAgentPrompt(userPrompt) {
	const request = userPrompt.trim() || DEFAULT_RECONSTRUCTION_PROMPT;
	return `${request}\n\n${WORKER_EXECUTION_CONTRACT}`;
}
