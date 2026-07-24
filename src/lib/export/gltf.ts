// Client-side GLB / glTF export. The skill produces a *procedural* model (code
// that builds a THREE.Group at runtime), so we export by running GLTFExporter on
// the instantiated group in the viewer — exactly what the TODO's Core features
// call for. Canvas/procedural textures on standard materials bake into the file
// automatically; materials the exporter can't represent are flagged up front so
// we never hand back a silently-broken file.

import type * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

export interface ExportIssue {
	object: string;
	material: string;
	reason: string;
}

// glTF's material model is metallic-roughness. GLTFExporter handles these
// cleanly (and converts Phong/Lambert). Anything else — custom shaders, points,
// lines — won't survive the round-trip.
const EXPORTABLE_MATERIALS = new Set([
	"MeshStandardMaterial",
	"MeshPhysicalMaterial",
	"MeshBasicMaterial",
	"MeshLambertMaterial",
	"MeshPhongMaterial",
]);

export function checkExportable(root: THREE.Object3D): ExportIssue[] {
	const issues: ExportIssue[] = [];
	root.traverse((obj) => {
		const mesh = obj as THREE.Mesh;
		if (!mesh.isMesh) return;
		const materials = Array.isArray(mesh.material)
			? mesh.material
			: [mesh.material];
		for (const material of materials) {
			if (!material) continue;
			const type = material.type;
			const isShader =
				(material as THREE.ShaderMaterial).isShaderMaterial === true;
			if (isShader || !EXPORTABLE_MATERIALS.has(type)) {
				issues.push({
					object: obj.name || obj.type,
					material: type,
					reason: isShader
						? "custom shader material has no glTF equivalent"
						: `material type "${type}" is not exportable to glTF`,
				});
			}
		}
	});
	return issues;
}

function parse(
	root: THREE.Object3D,
	binary: boolean,
): Promise<ArrayBuffer | object> {
	return new Promise((resolve, reject) => {
		new GLTFExporter().parse(
			root,
			(result) => resolve(result),
			(error) => reject(error),
			{ binary },
		);
	});
}

export async function exportGLB(root: THREE.Object3D): Promise<Blob> {
	const result = (await parse(root, true)) as ArrayBuffer;
	return new Blob([result], { type: "model/gltf-binary" });
}

export async function exportGLTF(root: THREE.Object3D): Promise<Blob> {
	const result = await parse(root, false);
	return new Blob([JSON.stringify(result, null, 2)], {
		type: "model/gltf+json",
	});
}

// Trigger a browser download for an exported blob.
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
