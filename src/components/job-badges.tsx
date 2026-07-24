import type { JobOutcome, JobStatus } from "@/lib/jobs/types";

const STATUS_META: Record<JobStatus, { label: string; className: string }> = {
	queued: { label: "Queued", className: "bg-white/10 text-[#a9b0bd]" },
	running: { label: "Running", className: "bg-[#86a9e8]/15 text-[#86a9e8]" },
	succeeded: {
		label: "Succeeded",
		className: "bg-emerald-500/15 text-emerald-300",
	},
	"needs-input": {
		label: "Needs input",
		className: "bg-amber-500/15 text-amber-300",
	},
	failed: { label: "Failed", className: "bg-destructive/20 text-destructive" },
};

const OUTCOME_META: Record<JobOutcome, { label: string; description: string }> =
	{
		reconstructed: {
			label: "Reconstructed",
			description: "Hit the fidelity contract from the reference.",
		},
		"stylized-only": {
			label: "Stylized only",
			description: "A faithful stylization — not a detail-exact match.",
		},
		"needs-more-views": {
			label: "Needs more views",
			description:
				"One image couldn't reveal enough geometry. Best-effort shown.",
		},
	};

export function StatusBadge({ status }: { status: JobStatus }) {
	const meta = STATUS_META[status];
	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
		>
			{status === "running" && (
				<span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-current" />
			)}
			{meta.label}
		</span>
	);
}

export function OutcomeBadge({ outcome }: { outcome: JobOutcome }) {
	const meta = OUTCOME_META[outcome];
	return (
		<span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-[#cdd3de]">
			{meta.label}
		</span>
	);
}

export function outcomeDescription(outcome: JobOutcome): string {
	return OUTCOME_META[outcome].description;
}
