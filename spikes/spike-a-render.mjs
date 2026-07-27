// Spike A — headless WebGL screenshot (throwaway de-risking script).
//
// Success = a non-empty "hello triangle" PNG captured in headless Chromium, on
// whatever GL backend the target infra provides. If this is flaky, the whole
// img2threejs review loop (which renders + screenshots every pass) is flaky.
//
// Run (isolated, does NOT use the app's deps):
//   cd spikes && npm i playwright && npx playwright install chromium
//   node spike-a-render.mjs   → writes spike-a-out.png, prints a JSON verdict
//
// FINDINGS (see README.md): PASS on this machine via SwiftShader/ANGLE (software
// WebGL, no GPU needed). NOTE: page.screenshot() does NOT reliably composite a
// WebGL canvas headless — capture the canvas directly (toDataURL/readPixels).

import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const OUT = new URL("./spike-a-out.png", import.meta.url).pathname;

const PAGE = `<!doctype html><html><body style="margin:0">
<canvas id="c" width="480" height="360"></canvas>
<script>
const gl = document.getElementById("c").getContext("webgl", { preserveDrawingBuffer: true });
window.__glok = !!gl;
if (gl) {
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  window.__renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "(masked)";
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, "attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }");
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, "precision mediump float; void main(){ gl_FragColor = vec4(0.55,0.68,0.91,1.0); }");
  gl.compileShader(fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0.8, -0.8,-0.8, 0.8,-0.8]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.clearColor(0.04, 0.05, 0.07, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const px = new Uint8Array(480 * 360 * 4);
  gl.readPixels(0, 0, 480, 360, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let lit = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i] > 120 && px[i+2] > 200) lit++;
  window.__litPixels = lit;
  window.__canvasPng = document.getElementById("c").toDataURL("image/png");
}
</script></body></html>`;

async function run() {
	const browser = await chromium.launch({
		headless: true,
		args: ["--enable-unsafe-swiftshader"], // software WebGL fallback (no GPU)
	});
	try {
		const page = await browser.newPage({
			viewport: { width: 480, height: 360 },
		});
		await page.setContent(PAGE, { waitUntil: "load" });
		await page.waitForFunction("window.__glok !== undefined", {
			timeout: 10000,
		});

		const glok = await page.evaluate("window.__glok");
		const renderer = await page.evaluate("window.__renderer");
		const litPixels = await page.evaluate("window.__litPixels");
		const canvasPng = await page.evaluate("window.__canvasPng");
		const canvasBuf = Buffer.from(String(canvasPng).split(",")[1], "base64");
		writeFileSync(OUT, canvasBuf);

		const ok = glok && litPixels > 500 && canvasBuf.length > 500;
		console.log(
			JSON.stringify(
				{
					webglAvailable: glok,
					renderer,
					litTrianglePixels: litPixels,
					canvasCaptureBytes: canvasBuf.length,
					screenshot: OUT,
					verdict: ok ? "PASS" : "FAIL",
				},
				null,
				2,
			),
		);
		process.exit(ok ? 0 : 1);
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Spike A crashed:", err);
	process.exit(2);
});
