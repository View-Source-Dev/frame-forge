"use client";

import { Check, Copy, Download, Link2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import ShareViewer from "@/components/share-viewer";
import { Button } from "@/components/ui/button";

// Result viewer for a real worker job: the artifact is already a rendered GLB on
// the server, so we load it directly (no client-side re-export). Download is a
// direct link to the artifact; Share persists that same stored GLB.
export default function GlbResult({ jobId }: { jobId: string }) {
	const [sharing, setSharing] = useState(false);
	const [shareUrl, setShareUrl] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const share = useCallback(async () => {
		setError(null);
		setSharing(true);
		try {
			const form = new FormData();
			form.append("jobId", jobId);
			const res = await fetch("/api/share", { method: "POST", body: form });
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(body.error ?? "Could not create share link.");
			}
			const { path } = (await res.json()) as { path: string };
			setShareUrl(`${window.location.origin}${path}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Share failed.");
		} finally {
			setSharing(false);
		}
	}, [jobId]);

	const copy = useCallback(async () => {
		if (!shareUrl) return;
		await navigator.clipboard.writeText(shareUrl);
		setCopied(true);
	}, [shareUrl]);

	useEffect(() => {
		if (!copied) return;
		const t = setTimeout(() => setCopied(false), 1600);
		return () => clearTimeout(t);
	}, [copied]);

	return (
		<div className="flex flex-col gap-3">
			<div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0d11]">
				<ShareViewer url={`/api/jobs/${jobId}/model`} />
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<Button asChild variant="secondary">
					<a
						href={`/api/jobs/${jobId}/model`}
						download={`frame-forge-${jobId.slice(0, 8)}.glb`}
					>
						<Download />
						Download GLB
					</a>
				</Button>
				<Button variant="outline" onClick={share} disabled={sharing}>
					{sharing ? <Loader2 className="animate-spin" /> : <Link2 />}
					Share
				</Button>
			</div>

			{error && (
				<p className="text-xs text-destructive" role="alert">
					{error}
				</p>
			)}

			{shareUrl && (
				<div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2">
					<input
						readOnly
						value={shareUrl}
						className="min-w-0 flex-1 bg-transparent px-2 py-1 text-xs text-muted-foreground outline-none"
						onFocus={(e) => e.currentTarget.select()}
					/>
					<Button size="sm" variant="ghost" onClick={copy}>
						{copied ? <Check className="text-emerald-400" /> : <Copy />}
						{copied ? "Copied" : "Copy"}
					</Button>
				</div>
			)}
		</div>
	);
}
