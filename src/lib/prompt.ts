import {
	buildAgentPrompt,
	DEFAULT_RECONSTRUCTION_PROMPT,
} from "../../shared/reconstruction-prompt.mjs";

export { DEFAULT_RECONSTRUCTION_PROMPT };

// The editable user request is followed by the worker-only execution contract.
// Keeping both app and standalone worker on this shared builder prevents the
// prompt shown in the UI from drifting away from what the agent receives.
export function buildPrompt(userPrompt: string): string {
	return buildAgentPrompt(userPrompt);
}
