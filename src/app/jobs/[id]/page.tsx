import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@/components/icons";
import JobMonitor from "@/components/job-monitor";
import { PageShell } from "@/components/page-shell";
import { readJob } from "@/lib/jobs/store";

export const dynamic = "force-dynamic";

export default async function JobPage({ params }: PageProps<"/jobs/[id]">) {
	const { id } = await params;
	const job = await readJob(id);
	if (!job) notFound();

	return (
		<PageShell>
			<Link
				href="/jobs"
				className="mb-6 inline-flex items-center gap-1.5 text-xs text-[#858c98] transition-colors duration-150 ease-[var(--ease-out)] hover:text-[#f2f3f5]"
			>
				<ArrowLeft className="size-3.5" />
				All jobs
			</Link>
			<h1 className="mb-8 text-2xl font-medium tracking-tight">
				Reconstruction
			</h1>
			<JobMonitor initialJob={job} />
		</PageShell>
	);
}
