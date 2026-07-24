import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "@/components/icons";
import { StatusBadge } from "@/components/job-badges";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { listJobs } from "@/lib/jobs/store";
import { modelLabel } from "@/lib/models/registry";

export const metadata: Metadata = { title: "Jobs — Frame Forge" };

// Always read the live job state from disk.
export const dynamic = "force-dynamic";

function when(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export default async function JobsPage() {
	const jobs = await listJobs();

	return (
		<PageShell>
			<div className="mb-8 flex items-center justify-between">
				<h1 className="text-2xl font-medium tracking-tight">Jobs</h1>
				<Button asChild variant="secondary">
					<Link href="/studio">
						<Plus />
						New
					</Link>
				</Button>
			</div>

			{jobs.length === 0 ? (
				<div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-white/15 bg-white/[0.02] py-20 text-center">
					<p className="text-sm text-[#a9b0bd]">No reconstructions yet.</p>
					<Button asChild>
						<Link href="/studio">
							Start your first
							<ArrowRight />
						</Link>
					</Button>
				</div>
			) : (
				<ul className="flex flex-col gap-2">
					{jobs.map((job) => (
						<li key={job.id}>
							<Link
								href={`/jobs/${job.id}`}
								className="group flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 transition-colors duration-150 ease-[var(--ease-out)] hover:border-white/20 hover:bg-white/[0.04]"
							>
								{/* biome-ignore lint/performance/noImgElement: served from our own API route */}
								<img
									src={`/api/jobs/${job.id}/image`}
									alt=""
									className="size-14 shrink-0 rounded-lg border border-white/10 object-cover"
								/>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-[#f2f3f5]">
										{job.image?.name ?? "Reference"}
									</p>
									<p className="mt-0.5 text-xs text-[#858c98]">
										{when(job.createdAt)}
										{job.result && ` · ${modelLabel(job.result.modelKey)}`}
									</p>
								</div>
								<StatusBadge status={job.status} />
								<ArrowRight className="size-4 text-[#5b6270] transition-transform duration-150 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:text-[#a9b0bd]" />
							</Link>
						</li>
					))}
				</ul>
			)}
		</PageShell>
	);
}
