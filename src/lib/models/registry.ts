// Registry of procedural model factories, keyed by the `modelKey` stored on a
// job result. Each entry stands in for a distinct `createObjectModel.ts` the
// skill would emit. Keeping factories behind a key means the job store only
// records a small string, and the viewer resolves it to geometry client-side.

import type * as THREE from "three";
import { createDeskLamp } from "./desk-lamp";
import { createFieldCamera } from "./field-camera";
import { createGiftBox } from "./gift-box";

interface ModelEntry {
	label: string;
	build: () => THREE.Group;
}

const REGISTRY: Record<string, ModelEntry> = {
	"field-camera": { label: "Field camera", build: createFieldCamera },
	"gift-box": { label: "Gift box", build: createGiftBox },
	"desk-lamp": { label: "Desk lamp", build: createDeskLamp },
};

// Plain string array — safe to import from the (server-side) worker without
// pulling any browser-only build code into that module's execution.
export const MODEL_KEYS = Object.keys(REGISTRY);

export function buildModel(key: string): THREE.Group {
	const entry = REGISTRY[key];
	if (!entry) throw new Error(`Unknown model key: ${key}`);
	return entry.build();
}

export function modelLabel(key: string): string {
	return REGISTRY[key]?.label ?? key;
}
