// The fixed reconstruction prompt. Wiring this default in — so the designer
// never touches the CLI or the prompt — is the entire point of the product.
//
// Designers can add optional free-text notes; those are appended, never a
// replacement, so the guardrails (intended use, stylization policy) always hold.

const TEMPLATE = `Reconstruct the object visible in the attached reference image as a
procedural Three.js model using the img2threejs skill.

- Intended use: real-time browser prop with interactive performance.
- Stylization is allowed when a single image cannot reveal hidden geometry —
  prefer a faithful, action-ready approximation over a fake-precise guess.
- Follow the staged sculpting pipeline and the AI-vision review loop; a
  quality-gated "stylized only" or "needs more views" is a valid outcome.`;

export function buildPrompt(designerNotes: string): string {
	const notes = designerNotes.trim();
	if (!notes) return TEMPLATE;
	return `${TEMPLATE}\n\nDesigner notes: ${notes}`;
}
