"use client";

import { ArrowRight, ImageUp, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Job } from "@/lib/jobs/types";

export default function UploadForm() {
	const router = useRouter();
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [prompt, setPrompt] = useState("");
	const [dragging, setDragging] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const choose = useCallback((next: File | null | undefined) => {
		if (!next) return;
		if (!next.type.startsWith("image/")) {
			setError("Please choose an image file.");
			return;
		}
		setError(null);
		setFile(next);
		setPreviewUrl((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return URL.createObjectURL(next);
		});
	}, []);

	const clear = useCallback(() => {
		setFile(null);
		setPreviewUrl((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return null;
		});
	}, []);

	// Revoke the last preview URL on unmount.
	useEffect(() => {
		return () => {
			if (previewUrl) URL.revokeObjectURL(previewUrl);
		};
	}, [previewUrl]);

	const submit = useCallback(async () => {
		if (!file) return;
		setSubmitting(true);
		setError(null);
		try {
			const form = new FormData();
			form.append("image", file);
			form.append("prompt", prompt);
			const res = await fetch("/api/jobs", { method: "POST", body: form });
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(body.error ?? "Upload failed.");
			}
			const job = (await res.json()) as Job;
			router.push(`/jobs/${job.id}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Upload failed.");
			setSubmitting(false);
		}
	}, [file, prompt, router]);

	return (
		<div className="flex flex-col gap-5">
			{/* Dropzone */}
			<button
				type="button"
				onClick={() => document.getElementById("image-input")?.click()}
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDragging(false);
					choose(e.dataTransfer.files?.[0]);
				}}
				className={`group relative flex min-h-56 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed p-6 text-center transition-colors duration-200 ease-[var(--ease-out)] ${
					dragging
						? "border-[#86a9e8] bg-[#86a9e8]/10"
						: "border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
				}`}
			>
				{previewUrl ? (
					// biome-ignore lint/performance/noImgElement: local object-URL preview, not a remote asset
					<img
						src={previewUrl}
						alt="Selected reference"
						className="max-h-64 w-auto rounded-lg object-contain"
					/>
				) : (
					<>
						<ImageUp className="mb-3 size-7 text-[#6b7280] transition-transform duration-200 ease-[var(--ease-out)] group-hover:-translate-y-0.5 group-hover:text-[#86a9e8]" />
						<p className="text-sm font-medium text-[#f2f3f5]">
							Drop a product image, or click to browse
						</p>
						<p className="mt-1 text-xs text-[#858c98]">
							PNG or JPG, up to 12 MB. One clean object on a plain background
							reconstructs best.
						</p>
					</>
				)}
			</button>
			<input
				id="image-input"
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(e) => choose(e.target.files?.[0])}
			/>

			{file && (
				<div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[#a9b0bd]">
					<span className="truncate">
						{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
					</span>
					<Button
						size="icon-xs"
						variant="ghost"
						onClick={clear}
						aria-label="Remove"
					>
						<X />
					</Button>
				</div>
			)}

			{/* Optional notes */}
			<div className="flex flex-col gap-2">
				<label
					htmlFor="notes"
					className="text-xs font-medium uppercase tracking-[0.14em] text-[#858c98]"
				>
					Notes <span className="normal-case tracking-normal">(optional)</span>
				</label>
				<textarea
					id="notes"
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
					rows={3}
					placeholder="Anything that helps — material, scale, which side is the front…"
					className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-[#f2f3f5] outline-none transition-colors duration-150 ease-[var(--ease-out)] placeholder:text-[#5b6270] focus:border-[#86a9e8]/60 focus:bg-white/[0.04]"
				/>
				<p className="text-xs text-[#5b6270]">
					A default reconstruction prompt is applied automatically — you never
					touch the CLI or the prompt.
				</p>
			</div>

			{error && (
				<p className="text-xs text-destructive" role="alert">
					{error}
				</p>
			)}

			<div className="flex items-center gap-3">
				<Button size="lg" onClick={submit} disabled={!file || submitting}>
					{submitting ? <Loader2 className="animate-spin" /> : null}
					{submitting ? "Submitting…" : "Start reconstruction"}
					{!submitting && <ArrowRight />}
				</Button>
				<p className="text-xs text-[#5b6270]">
					Runs take a few minutes — submit and come back.
				</p>
			</div>
		</div>
	);
}
