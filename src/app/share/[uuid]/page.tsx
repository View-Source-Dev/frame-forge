import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Boxes } from "@/components/icons";
import ShareViewer from "@/components/share-viewer";
import { Button } from "@/components/ui/button";
import { readShareMeta } from "@/lib/shares/store";

export const dynamic = "force-dynamic";

export default async function SharePage({
	params,
}: PageProps<"/share/[uuid]">) {
	const { uuid } = await params;
	const meta = await readShareMeta(uuid);
	if (!meta) notFound();

	return (
		<section className="relative isolate min-h-dvh overflow-hidden bg-[#0b0d11] text-[#f2f3f5]">
			<ShareViewer url={`/api/share/${uuid}/model`} />

			{/* Top-left identity + title */}
			<header className="pointer-events-none absolute left-6 top-6 z-10">
				<Link
					href="/"
					className="pointer-events-auto inline-flex items-center gap-2 text-sm font-semibold tracking-tight"
				>
					<Boxes className="size-4 text-[#86a9e8]" />
					Frame Forge
				</Link>
				<p className="mt-3 text-xl font-medium tracking-tight">{meta.title}</p>
				<p className="text-xs text-[#858c98]">
					Shared 3D reconstruction · drag to orbit
				</p>
			</header>

			{/* Bottom-right CTA */}
			<div className="absolute bottom-6 right-6 z-10">
				<Button asChild variant="secondary">
					<Link href="/studio">
						Reconstruct your own
						<ArrowRight />
					</Link>
				</Button>
			</div>
		</section>
	);
}
