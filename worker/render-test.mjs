// $0 verification of render-model.mjs using the Spike B sample factory.
// No model tokens — pure render + export.

import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderAndExport } from "./render-model.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ws = path.join(HERE, ".render-test-workspace");
mkdirSync(path.join(ws, "src"), { recursive: true });
copyFileSync(
	path.join(HERE, "..", "spikes", "evidence", "createObjectModel.sample.ts"),
	path.join(ws, "src", "createObjectModel.ts"),
);

const start = Date.now();
const { glb, preview, materialAudit } = await renderAndExport({
	workspaceDir: ws,
});
writeFileSync(path.join(HERE, "render-test.glb"), glb);
writeFileSync(path.join(HERE, "render-test-preview.png"), preview);

const jsonChunkLength = glb.readUInt32LE(12);
const jsonChunkType = glb.readUInt32LE(16);
if (jsonChunkType !== 0x4e4f534a) {
	throw new Error("render-test GLB does not start with a JSON chunk");
}
const gltf = JSON.parse(
	glb
		.subarray(20, 20 + jsonChunkLength)
		.toString("utf8")
		.trim(),
);
const exportedMaterials = gltf.materials ?? [];
const allDoubleSided =
	exportedMaterials.length > 0 &&
	exportedMaterials.every((material) => material.doubleSided === true);
const passed =
	glb.length > 1000 &&
	preview.length > 1000 &&
	materialAudit.total > 0 &&
	allDoubleSided;

console.log(
	JSON.stringify(
		{
			glbBytes: glb.length,
			previewBytes: preview.length,
			materialAudit,
			exportedMaterialCount: exportedMaterials.length,
			allDoubleSided,
			seconds: Math.round((Date.now() - start) / 1000),
			verdict: passed ? "PASS" : "FAIL",
		},
		null,
		2,
	),
);
if (!passed) process.exitCode = 1;
