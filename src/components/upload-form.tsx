"use client";

import {
	ArrowRight,
	Check,
	FileImage,
	ImageUp,
	Loader2,
	Settings2,
	ShieldCheck,
	WandSparkles,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Job } from "@/lib/jobs/types";
import { DEFAULT_RECONSTRUCTION_PROMPT } from "@/lib/prompt";

export default function UploadForm() {
	const router = useRouter();
	const inputRef = useRef<HTMLInputElement>(null);
	const [file, setFile] = useState<File | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [prompt, setPrompt] = useState(DEFAULT_RECONSTRUCTION_PROMPT);
	const [dragging, setDragging] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const choose = useCallback((next: File | null | undefined) => {
		if (!next) return;
		if (!next.type.startsWith("image/")) {
			setError("Please choose an image file.");
			return;
		}
		if (next.size > 12 * 1024 * 1024) {
			setError("That image is larger than 12 MB.");
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
		if (inputRef.current) inputRef.current.value = "";
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
		<div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-[#111419] shadow-2xl shadow-black/20">
			<div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
				<div className="flex items-center gap-3">
					<div className="flex size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-[#96abd0]">
						<FileImage className="size-4" />
					</div>
					<div>
						<p className="text-[13px] font-medium text-[#eef1f6]">
							Reference image
						</p>
						<p className="mt-0.5 text-[10px] text-[#6d7684]">
							The object, labels, and materials come from this image.
						</p>
					</div>
				</div>
				{file && (
					<span className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-300/80">
						<Check className="size-2.5" strokeWidth={3} />
						Ready
					</span>
				)}
			</div>

			<div className="p-5">
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					onDragOver={(event) => {
						event.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={(event) => {
						event.preventDefault();
						setDragging(false);
						choose(event.dataTransfer.files?.[0]);
					}}
					className={`group relative flex min-h-[300px] w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed p-5 text-center outline-none transition-[border-color,background-color,transform,box-shadow] duration-200 ease-[var(--ease-out)] focus-visible:border-[#8faad3]/55 focus-visible:ring-3 focus-visible:ring-[#7697c8]/15 active:scale-[0.995] ${
						dragging
							? "border-[#91acd6]/70 bg-[#7896c6]/10"
							: previewUrl
								? "border-white/[0.09] bg-[#0b0e12]"
								: "border-white/[0.13] bg-white/[0.018] hover:border-white/[0.23] hover:bg-white/[0.035]"
					}`}
				>
					{previewUrl ? (
						<>
							{/* biome-ignore lint/performance/noImgElement: local object-URL preview, not a remote asset */}
							<img
								src={previewUrl}
								alt="Selected reference"
								className="max-h-[260px] max-w-full rounded-lg object-contain shadow-xl shadow-black/25"
							/>
							<span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[#11151b]/85 px-3 py-1.5 text-[10px] text-[#9ca5b3] opacity-0 backdrop-blur-md transition-opacity duration-150 ease-[var(--ease-out)] group-hover:opacity-100">
								Choose a different image
							</span>
						</>
					) : (
						<>
							<div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-[#7f8ca0] shadow-inner transition-[color,transform,border-color] duration-200 ease-[var(--ease-out)] group-hover:-translate-y-0.5 group-hover:border-[#8aa6d1]/25 group-hover:text-[#9eb7dc]">
								<ImageUp className="size-5" />
							</div>
							<p className="text-[13px] font-medium text-[#ebeff5]">
								Drop an image here
							</p>
							<p className="mt-1.5 text-[11px] text-[#707987]">
								or click to browse from your computer
							</p>
							<span className="mt-5 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-[9px] font-medium uppercase tracking-[0.12em] text-[#606a78]">
								PNG · JPG · WebP · 12 MB max
							</span>
						</>
					)}
				</button>
				<input
					ref={inputRef}
					id="image-input"
					type="file"
					accept="image/png,image/jpeg,image/webp"
					className="hidden"
					onChange={(event) => choose(event.target.files?.[0])}
				/>

				{file && (
					<div className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[10px] text-[#858e9c]">
						<span className="truncate">
							{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
						</span>
						<Button
							size="icon-xs"
							variant="ghost"
							onClick={clear}
							aria-label="Remove selected image"
							className="text-[#77808d] hover:text-white"
						>
							<X />
						</Button>
					</div>
				)}

				<details className="group/settings mt-4 rounded-xl border border-white/[0.07] bg-white/[0.018]">
					<summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-[11px] text-[#9aa3b0] outline-none marker:hidden focus-visible:ring-3 focus-visible:ring-[#7f9fce]/20">
						<span className="flex items-center gap-2">
							<Settings2 className="size-3.5 text-[#71809a]" />
							Advanced reconstruction brief
						</span>
						<span className="text-[10px] text-[#5f6875] group-open/settings:hidden">
							Default
						</span>
						<span className="hidden text-[10px] text-[#6f7f98] group-open/settings:block">
							Editing
						</span>
					</summary>
					<div className="border-t border-white/[0.06] p-3">
						<div className="mb-2 flex items-center justify-between gap-3">
							<label
								htmlFor="prompt"
								className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#687281]"
							>
								Worker instructions
							</label>
							<Button
								type="button"
								size="xs"
								variant="ghost"
								onClick={() => setPrompt(DEFAULT_RECONSTRUCTION_PROMPT)}
								disabled={prompt === DEFAULT_RECONSTRUCTION_PROMPT}
							>
								Reset
							</Button>
						</div>
						<textarea
							id="prompt"
							value={prompt}
							onChange={(event) => setPrompt(event.target.value)}
							rows={10}
							placeholder="Describe how the worker should reconstruct this image…"
							className="w-full resize-y rounded-lg border border-white/[0.08] bg-[#0b0e12] px-3 py-2 font-mono text-[10px] leading-relaxed text-[#c9d0da] outline-none transition-[border-color,background-color] duration-150 ease-[var(--ease-out)] placeholder:text-[#4f5865] focus:border-[#86a9e8]/50 focus:bg-[#0d1116]"
						/>
					</div>
				</details>

				{error && (
					<p
						className="mt-3 rounded-lg border border-destructive/20 bg-destructive/[0.08] px-3 py-2 text-[11px] text-destructive"
						role="alert"
					>
						{error}
					</p>
				)}

				<div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
					<Button
						size="lg"
						onClick={submit}
						disabled={!file || submitting}
						className="h-10 bg-[#e7ecf4] px-4 text-[#12171d] hover:bg-white"
					>
						{submitting ? (
							<Loader2 className="animate-spin" />
						) : (
							<WandSparkles />
						)}
						{submitting ? "Sending to the forge…" : "Start reconstruction"}
						{!submitting && <ArrowRight />}
					</Button>
					<p className="flex items-center gap-1.5 text-[10px] text-[#626c79]">
						<ShieldCheck className="size-3.5 text-[#75849b]" />
						Your source stays private. Runs take a few minutes.
					</p>
				</div>
			</div>
		</div>
	);
}
