"use client";

import { useEffect, useRef, useState } from "react";
import GlbResult from "@/components/glb-result";
import {
	OutcomeBadge,
	outcomeDescription,
	StatusBadge,
} from "@/components/job-badges";
import ModelViewer from "@/components/model-viewer";
import { isTerminal, type Job } from "@/lib/jobs/types";
import { modelLabel } from "@/lib/models/registry";

const POLL_MS = 1200;

export default function JobMonitor({ initialJob }: { initialJob: Job }) {
	const [job, setJob] = useState<Job>(initialJob);
	const timer = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		if (isTerminal(job.status)) return;
		timer.current = setInterval(async () => {
			try {
				const res = await fetch(`/api/jobs/${initialJob.id}`, {
					cache: "no-store",
				});
				if (!res.ok) return;
				const next = (await res.json()) as Job;
				setJob(next);
				if (isTerminal(next.status) && timer.current) {
					clearInterval(timer.current);
				}
			} catch {
				// transient network error — keep polling
			}
		}, POLL_MS);
		return () => {
			if (timer.current) clearInterval(timer.current);
		};
		// Re-arm only when we cross into/out of a terminal state.
	}, [job.status, initialJob.id]);

	const latest = job.passes[job.passes.length - 1];
	const progress =
		job.totalPasses > 0 ? job.passes.length / job.totalPasses : 0;
	const done = isTerminal(job.status);
	const hasModel = job.result !== null;

	return (
		<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
			{/* Left: reference + review trace */}
			<div className="flex flex-col gap-5">
				<figure className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
					{/* biome-ignore lint/performance/noImgElement: served from our own API route */}
					<img
						src={`/api/jobs/${job.id}/image`}
						alt="Reference"
						className="max-h-80 w-full object-contain"
					/>
					<figcaption className="border-t border-white/10 px-3 py-2 text-xs text-[#858c98]">
						{job.image?.name ?? "Reference image"}
					</figcaption>
				</figure>

				<div>
					<div className="mb-2 flex items-center justify-between text-xs text-[#858c98]">
						<span>
							Review loop —{" "}
							{done
								? `${job.passes.length} passes`
								: `pass ${job.passes.length} of ${job.totalPasses}`}
						</span>
						{latest && latest.fidelity > 0 && (
							<span>fidelity {latest.fidelity.toFixed(2)}</span>
						)}
					</div>
					{/* Progress bar (scaleX, per motion guidance) */}
					<div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
						<div
							className="h-full origin-left rounded-full bg-[#86a9e8] transition-transform duration-500 ease-[var(--ease-out)]"
							style={{ transform: `scaleX(${progress})` }}
						/>
					</div>

					<ol className="mt-4 flex flex-col gap-1.5">
						{job.passes.map((pass) => (
							<li
								key={pass.pass}
								className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs transition-all duration-300 ease-[var(--ease-out)] [@starting-style]:translate-y-1 [@starting-style]:opacity-0"
							>
								<span className="mt-px font-mono text-[#5b6270]">
									{String(pass.pass).padStart(2, "0")}
								</span>
								<div className="min-w-0 flex-1">
									<div className="flex items-center justify-between gap-2">
										<span className="font-medium capitalize text-[#cdd3de]">
											{pass.layer}
										</span>
										{pass.fidelity > 0 && (
											<span className="font-mono text-[#858c98]">
												{pass.fidelity.toFixed(2)}
											</span>
										)}
									</div>
									<p className="mt-0.5 text-[#858c98]">{pass.summary}</p>
								</div>
							</li>
						))}
						{!done && (
							<li className="px-3 py-2 text-xs text-[#5b6270]">
								<span className="inline-flex items-center gap-2">
									<span className="size-1.5 animate-pulse rounded-full bg-[#86a9e8]" />
									Generating, rendering, and grading the next pass…
								</span>
							</li>
						)}
					</ol>
				</div>
			</div>

			{/* Right: status + result */}
			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-3">
					<StatusBadge status={job.status} />
					{job.result && <OutcomeBadge outcome={job.result.outcome} />}
				</div>

				{hasModel && job.result ? (
					<>
						{job.result.outcome !== "reconstructed" && (
							<p className="text-xs text-[#a9b0bd]">
								{outcomeDescription(job.result.outcome)}
							</p>
						)}
						{job.result.glb ? (
							<GlbResult jobId={job.id} />
						) : job.result.modelKey ? (
							<ModelViewer
								jobId={job.id}
								modelKey={job.result.modelKey}
								filename={`frame-forge-${modelLabel(job.result.modelKey)
									.toLowerCase()
									.replace(/\s+/g, "-")}`}
							/>
						) : null}
						{typeof job.result.costUsd === "number" && (
							<p className="text-xs text-[#5b6270]">
								Reconstruction cost ${job.result.costUsd.toFixed(2)}
							</p>
						)}
					</>
				) : job.status === "failed" ? (
					<div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
						{job.error ?? "The reconstruction failed."}
					</div>
				) : (
					<div className="flex aspect-4/3 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-center text-sm text-[#5b6270]">
						<p className="max-w-xs px-6">
							Your model will appear here when the review loop finishes. It’s
							safe to leave — the job keeps running.
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
