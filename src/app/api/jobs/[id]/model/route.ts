import { readModel } from "@/lib/jobs/store";

export const runtime = "nodejs";

// GET /api/jobs/[id]/model — serve the worker-rendered GLB artifact.
export async function GET(
	_request: Request,
	{ params }: RouteContext<"/api/jobs/[id]/model">,
): Promise<Response> {
	const { id } = await params;
	const glb = await readModel(id);
	if (!glb) return new Response("Not found", { status: 404 });
	return new Response(new Uint8Array(glb), {
		headers: {
			"Content-Type": "model/gltf-binary",
			"Cache-Control": "private, max-age=3600",
		},
	});
}
