import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";

// Shared chrome for the app's inner pages (everything but the full-bleed
// landing hero): sticky header + a centered content column on the dark studio
// background, so the whole product reads as one cohesive surface.
export function PageShell({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-dvh flex-col bg-[#0b0d11] text-[#f2f3f5]">
			<SiteHeader />
			<main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
				{children}
			</main>
		</div>
	);
}
