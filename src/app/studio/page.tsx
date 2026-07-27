import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import UploadForm from "@/components/upload-form";

export const metadata: Metadata = {
	title: "New reconstruction — Frame Forge",
};

export default function StudioPage() {
	return (
		<PageShell>
			<div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
				<aside className="pt-2">
					<p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#71809a]">
						New reconstruction
					</p>
					<h1 className="mt-4 text-[32px] font-medium leading-[1.02] tracking-[-0.04em] text-[#f2f4f8]">
						From reference
						<br />
						to real geometry.
					</h1>
					<p className="mt-4 text-[12px] leading-5 text-[#7f8896]">
						Frame Forge reads the object, separates its assemblies, infers
						materials, and rebuilds it as procedural Three.js.
					</p>

					<ol className="mt-8 space-y-1">
						{[
							["01", "Reference", "Upload a clear product image"],
							["02", "Reconstruct", "Generate and review each pass"],
							["03", "Inspect", "Rotate, explode, and export"],
						].map(([number, title, description], index) => (
							<li
								key={number}
								className={`flex gap-3 rounded-xl px-3 py-3 ${
									index === 0
										? "border border-[#8ca8d2]/15 bg-[#7895bf]/[0.065]"
										: "opacity-45"
								}`}
							>
								<span className="font-mono text-[9px] text-[#70809a]">
									{number}
								</span>
								<span>
									<span className="block text-[11px] font-medium text-[#cfd5de]">
										{title}
									</span>
									<span className="mt-0.5 block text-[9px] leading-4 text-[#69727f]">
										{description}
									</span>
								</span>
							</li>
						))}
					</ol>
				</aside>
				<section aria-label="Image upload">
					<UploadForm />
				</section>
			</div>
		</PageShell>
	);
}
