import Link from "next/link";
import type { ReactNode } from "react";
import { Boxes } from "@/components/icons";

function NavLink({ href, children }: { href: string; children: ReactNode }) {
	return (
		<Link
			href={href}
			className="rounded-md px-2.5 py-1.5 text-[#a9b0bd] transition-colors duration-150 ease-[var(--ease-out)] hover:bg-white/5 hover:text-[#f2f3f5]"
		>
			{children}
		</Link>
	);
}

export function SiteHeader() {
	return (
		<header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0d11]/80 backdrop-blur-md">
			<div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5">
				<Link
					href="/"
					className="group flex items-center gap-2 text-sm font-semibold tracking-tight text-[#f2f3f5]"
				>
					<Boxes className="size-4 text-[#86a9e8] transition-transform duration-200 ease-[var(--ease-out)] group-hover:rotate-6" />
					Frame Forge
				</Link>
				<nav className="flex items-center gap-1 text-sm">
					<NavLink href="/studio">New</NavLink>
					<NavLink href="/jobs">Jobs</NavLink>
				</nav>
			</div>
		</header>
	);
}
