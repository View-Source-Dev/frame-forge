// Render + GLB export harness (the deterministic, $0 half of the worker).
//
// Given a job workspace containing src/createObjectModel.ts (the skill's output),
// this:
//   1. esbuild-bundles the generated factory + three + GLTFExporter for the browser,
//   2. renders it once in headless Chromium (Spike A: capture the CANVAS, not the page),
//   3. runs GLTFExporter in-page to produce the portable GLB (worker-side export),
//   4. returns { glb: Buffer, preview: Buffer } — the artifact + a preview thumbnail.
//
// No model tokens are spent here; this is plain rendering.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";

const WORKER_DIR = path.dirname(fileURLToPath(import.meta.url));
const W = 900;
const H = 675;

// Browser entry: build the model, frame it, render, then export GLB. Written as
// a string so esbuild can bundle it with the (absolute-path) generated factory.
function entrySource(factoryAbsPath) {
	return `
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import * as MODEL from ${JSON.stringify(factoryAbsPath)};

function pickFactory(mod) {
  if (typeof mod.default === "function") return mod.default;
  const named = Object.entries(mod).filter(
    ([n, v]) => typeof v === "function" && /Model$/.test(n) && !/Lights?$/i.test(n),
  );
  if (named.length) return named[0][1];
  return Object.values(mod).find((v) => typeof v === "function");
}

function buildGroup(factory) {
  // Signature varies across generated files: (options) or (spec, options).
  for (const args of [[], [{}], [{}, {}]]) {
    try {
      const g = factory(...args);
      if (g && g.isObject3D) return g;
    } catch (_) {}
  }
  throw new Error("factory did not return an Object3D");
}

async function main() {
  const factory = pickFactory(MODEL);
  if (!factory) throw new Error("no factory export found in createObjectModel");
  const group = buildGroup(factory);

  const scene = new THREE.Scene();
  scene.add(group);

  // Frame: recenter to origin, scale to a ~2-unit box.
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2.0 / maxDim;
  group.scale.setScalar(scale);
  group.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

  scene.add(new THREE.HemisphereLight(0xdfe7ff, 0x1a1d24, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 5, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0x88a0d0, 0.7);
  fill.position.set(-4, 1, -3); scene.add(fill);

  const canvas = document.getElementById("c");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(${W}, ${H}, false);
  renderer.setClearColor(0x0b0d11, 1);
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  const camera = new THREE.PerspectiveCamera(35, ${W} / ${H}, 0.1, 100);
  camera.position.set(2.4, 1.6, 3.4);
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  window.__png = canvas.toDataURL("image/png");

  const exporter = new GLTFExporter();
  exporter.parse(
    group,
    (result) => {
      const bytes = new Uint8Array(result);
      let bin = "";
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      window.__glb = btoa(bin);
      window.__done = true;
    },
    (err) => { window.__error = String(err); window.__done = true; },
    { binary: true },
  );
}

main().catch((e) => { window.__error = String((e && e.stack) || e); window.__done = true; });
`;
}

export async function renderAndExport({ workspaceDir }) {
	const factoryAbs = path.join(workspaceDir, "src", "createObjectModel.ts");

	// Bundle for the browser. resolveDir = worker dir so bare "three" resolves
	// from the worker's node_modules; the factory is imported by absolute path.
	const bundled = await build({
		stdin: {
			contents: entrySource(factoryAbs),
			resolveDir: WORKER_DIR,
			loader: "ts",
		},
		bundle: true,
		format: "iife",
		platform: "browser",
		write: false,
		logLevel: "silent",
	});
	const js = bundled.outputFiles[0].text;

	const browser = await chromium.launch({
		headless: true,
		args: ["--enable-unsafe-swiftshader"],
	});
	try {
		const page = await browser.newPage({ viewport: { width: W, height: H } });
		await page.setContent(
			`<!doctype html><html><body style="margin:0"><canvas id="c" width="${W}" height="${H}"></canvas></body></html>`,
		);
		await page.addScriptTag({ content: js, type: "module" });
		await page.waitForFunction("window.__done === true", { timeout: 30000 });

		const error = await page.evaluate("window.__error || null");
		if (error) throw new Error(`render harness: ${error}`);

		const pngUrl = await page.evaluate("window.__png");
		const glbB64 = await page.evaluate("window.__glb");
		if (!glbB64) throw new Error("GLB export produced no data");

		return {
			glb: Buffer.from(glbB64, "base64"),
			preview: Buffer.from(String(pngUrl).split(",")[1], "base64"),
		};
	} finally {
		await browser.close();
	}
}
