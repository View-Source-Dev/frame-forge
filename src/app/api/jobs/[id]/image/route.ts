import { readImage } from "@/lib/jobs/store";

export const runtime = "nodejs";

// GET /api/jobs/[id]/image — serve the uploaded reference image.
export async function GET(
	_request: Request,
	{ params }: RouteContext<"/api/jobs/[id]/image">,
): Promise<Response> {
	const { id } = await params;
	const image = await readImage(id);
	if (!image) return new Response("Not found", { status: 404 });
	return new Response(new Uint8Array(image.bytes), {
		headers: {
			"Content-Type": image.type,
			"Cache-Control": "private, max-age=3600",
		},
	});
}
