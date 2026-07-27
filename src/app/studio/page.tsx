import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import UploadForm from "@/components/upload-form";

export const metadata: Metadata = {
	title: "New reconstruction — Frame Forge",
};

export default function StudioPage() {
	return (
		<PageShell>
			<div className="mb-8 max-w-xl">
				<h1 className="text-2xl font-medium tracking-tight">
					New reconstruction
				</h1>
				<p className="mt-2 text-sm leading-relaxed text-[#a9b0bd]">
					Upload a product design. Frame Forge reconstructs it as a procedural
					Three.js mesh through a staged, skill-guided workflow — then hands you
					a GLB you can drop into any engine.
				</p>
			</div>
			<div className="max-w-2xl">
				<UploadForm />
			</div>
		</PageShell>
	);
}
