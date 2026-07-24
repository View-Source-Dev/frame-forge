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
const { glb, preview } = await renderAndExport({ workspaceDir: ws });
writeFileSync(path.join(HERE, "render-test.glb"), glb);
writeFileSync(path.join(HERE, "render-test-preview.png"), preview);
console.log(
	JSON.stringify(
		{
			glbBytes: glb.length,
			previewBytes: preview.length,
			seconds: Math.round((Date.now() - start) / 1000),
			verdict: glb.length > 1000 && preview.length > 1000 ? "PASS" : "FAIL",
		},
		null,
		2,
	),
);
