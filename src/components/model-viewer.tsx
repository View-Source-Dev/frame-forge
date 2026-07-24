"use client";

import {
	AlertTriangle,
	Check,
	Copy,
	Download,
	Link2,
	Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import StudioScene from "@/components/studio-scene";
import { Button } from "@/components/ui/button";
import {
	checkExportable,
	downloadBlob,
	type ExportIssue,
	exportGLB,
	exportGLTF,
} from "@/lib/export/gltf";
import { disposeObject, fitToStage } from "@/lib/models/fit";
import { buildModel } from "@/lib/models/registry";

// Instantiates a procedural factory model into the shared studio scene and
// hands the built group back to the parent so it can be exported/shared.
function FactoryModel({
	modelKey,
	onReady,
}: {
	modelKey: string;
	onReady: (group: THREE.Group) => void;
}) {
	const group = useMemo(() => {
		const g = buildModel(modelKey);
		fitToStage(g);
		return g;
	}, [modelKey]);

	useEffect(() => {
		onReady(group);
		return () => disposeObject(group);
	}, [group, onReady]);

	return <primitive object={group} />;
}

type ExportKind = "glb" | "gltf" | null;

export default function ModelViewer({
	jobId,
	modelKey,
	filename,
}: {
	jobId: string;
	modelKey: string;
	filename: string;
}) {
	const groupRef = useRef<THREE.Group | null>(null);
	const [issues, setIssues] = useState<ExportIssue[]>([]);
	const [busy, setBusy] = useState<ExportKind>(null);
	const [sharing, setSharing] = useState(false);
	const [shareUrl, setShareUrl] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleReady = useCallback((group: THREE.Group) => {
		groupRef.current = group;
		// Surface anything that won't survive the glTF round-trip up front,
		// rather than shipping a silently-broken file.
		setIssues(checkExportable(group));
	}, []);

	const download = useCallback(
		async (kind: "glb" | "gltf") => {
			if (!groupRef.current) return;
			setError(null);
			setBusy(kind);
			try {
				if (kind === "glb") {
					downloadBlob(await exportGLB(groupRef.current), `${filename}.glb`);
				} else {
					downloadBlob(await exportGLTF(groupRef.current), `${filename}.gltf`);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Export failed.");
			} finally {
				setBusy(null);
			}
		},
		[filename],
	);

	const share = useCallback(async () => {
		if (!groupRef.current) return;
		setError(null);
		setSharing(true);
		try {
			// Persist the portable GLB (never the source) so the link never
			// re-runs the pipeline.
			const blob = await exportGLB(groupRef.current);
			const form = new FormData();
			form.append("glb", new File([blob], "model.glb", { type: blob.type }));
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

	// Reset the "copied" affordance shortly after it fires.
	useEffect(() => {
		if (!copied) return;
		const t = setTimeout(() => setCopied(false), 1600);
		return () => clearTimeout(t);
	}, [copied]);

	const subject = useMemo(
		() => <FactoryModel modelKey={modelKey} onReady={handleReady} />,
		[modelKey, handleReady],
	);

	return (
		<div className="flex flex-col gap-3">
			<div className="relative aspect-4/3 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0b0d11]">
				<div className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing">
					<StudioScene subject={subject} autoRotate={false} />
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<Button
					variant="secondary"
					onClick={() => download("glb")}
					disabled={busy !== null}
				>
					{busy === "glb" ? <Loader2 className="animate-spin" /> : <Download />}
					Download GLB
				</Button>
				<Button
					variant="outline"
					onClick={() => download("gltf")}
					disabled={busy !== null}
				>
					{busy === "gltf" ? (
						<Loader2 className="animate-spin" />
					) : (
						<Download />
					)}
					Download glTF
				</Button>
				<Button variant="outline" onClick={share} disabled={sharing}>
					{sharing ? <Loader2 className="animate-spin" /> : <Link2 />}
					Share
				</Button>
			</div>

			{issues.length > 0 && (
				<div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
					<AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
					<div>
						<p className="font-medium">
							Some materials may not export cleanly:
						</p>
						<ul className="mt-1 space-y-0.5 text-amber-200/80">
							{issues.map((issue) => (
								<li key={`${issue.object}-${issue.material}`}>
									{issue.object}: {issue.reason}
								</li>
							))}
						</ul>
					</div>
				</div>
			)}

			{error && (
				<p className="text-xs text-destructive" role="alert">
					{error}
				</p>
			)}

			{shareUrl && (
				<div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 duration-300 ease-[var(--ease-out)] [@starting-style]:opacity-0">
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
