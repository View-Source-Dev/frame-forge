import { readShareModel } from "@/lib/shares/store";

export const runtime = "nodejs";

// GET /api/share/[uuid]/model — serve the persisted GLB for a share.
export async function GET(
	_request: Request,
	{ params }: RouteContext<"/api/share/[uuid]/model">,
): Promise<Response> {
	const { uuid } = await params;
	const glb = await readShareModel(uuid);
	if (!glb) return new Response("Not found", { status: 404 });
	return new Response(new Uint8Array(glb), {
		headers: {
			"Content-Type": "model/gltf-binary",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}
