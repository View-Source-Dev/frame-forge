"use client";

import {
	Box,
	Camera,
	Check,
	ChevronRight,
	CircleHelp,
	Download,
	ImageUp,
	Layers3,
	MousePointer2,
	PackageOpen,
	Rotate3D,
	Sparkles,
	X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as THREE from "three";
import ModelExplorer, { type ModelPart } from "@/components/model-explorer";
import StudioScene from "@/components/studio-scene";
import { Button } from "@/components/ui/button";
import { downloadBlob, exportGLB } from "@/lib/export/gltf";

const MODELS = [
	{
		key: "field-camera",
		name: "Field Camera",
		description: "Six interactive assemblies · procedural PBR",
		ready: true,
		icon: Camera,
	},
	{
		key: "gift-box",
		name: "Gift Parcel",
		description: "Five layered assemblies · woven wrap",
		ready: true,
		icon: PackageOpen,
	},
	{
		key: "studio-speaker",
		name: "Studio Speaker",
		description: "Acoustic enclosure study",
		ready: false,
		icon: Box,
	},
	{
		key: "folding-drone",
		name: "Folding Drone",
		description: "Eight-part kinetic assembly",
		ready: false,
		icon: Layers3,
	},
] as const;

function ModelPicker({
	open,
	value,
	onClose,
	onSelect,
}: {
	open: boolean;
	value: string;
	onClose: () => void;
	onSelect: (key: string) => void;
}) {
	const firstOption = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (!open) return;
		const previousFocus = document.activeElement as HTMLElement | null;
		firstOption.current?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			previousFocus?.focus();
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: pointer handling only dismisses the modal when its non-interactive backdrop is pressed.
		<div
			className="studio-dialog-backdrop"
			role="presentation"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<section
				aria-labelledby="model-picker-title"
				aria-modal="true"
				className="studio-dialog"
				role="dialog"
			>
				<div className="flex items-start justify-between gap-6">
					<div>
						<div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-[#b9c9e7] shadow-inner">
							<Layers3 className="size-[18px]" />
						</div>
						<h2
							id="model-picker-title"
							className="text-[21px] font-medium tracking-[-0.025em] text-white"
						>
							Import model
						</h2>
						<p className="mt-1.5 text-[13px] leading-5 text-[#8d95a3]">
							Choose a reconstruction to inspect in the studio.
						</p>
					</div>
					<button
						type="button"
						aria-label="Close model picker"
						className="studio-icon-button"
						onClick={onClose}
					>
						<X className="size-4" />
					</button>
				</div>

				<div className="mt-7 grid gap-2 sm:grid-cols-2">
					{MODELS.map((model, index) => {
						const Icon = model.icon;
						const selected = model.key === value;
						return (
							<button
								key={model.key}
								ref={index === 0 ? firstOption : undefined}
								type="button"
								disabled={!model.ready}
								aria-pressed={selected}
								onClick={() => model.ready && onSelect(model.key)}
								className="model-option"
								data-selected={selected}
							>
								<span className="model-option-visual">
									<Icon className="size-6" strokeWidth={1.5} />
								</span>
								<span className="min-w-0 flex-1 text-left">
									<span className="flex items-center gap-2 text-[13px] font-medium text-[#f3f5f8]">
										{model.name}
										{selected && (
											<span className="flex size-4 items-center justify-center rounded-full bg-[#dce8ff] text-[#111820]">
												<Check className="size-2.5" strokeWidth={3} />
											</span>
										)}
									</span>
									<span className="mt-1 block truncate text-[11px] text-[#747d8b]">
										{model.description}
									</span>
								</span>
								{model.ready ? (
									<ChevronRight className="size-3.5 text-[#5c6470]" />
								) : (
									<span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.11em] text-[#6b7380]">
										Soon
									</span>
								)}
							</button>
						);
					})}
				</div>

				<div className="mt-6 flex items-center gap-2 border-t border-white/[0.07] pt-5 text-[11px] text-[#68717f]">
					<Sparkles className="size-3.5 text-[#859fc9]" />
					Models are generated procedurally from uploaded references.
				</div>
			</section>
		</div>
	);
}

function PartCard({
	part,
	active,
}: {
	part: ModelPart | null;
	active: boolean;
}) {
	return (
		<div className="pointer-events-none absolute right-5 top-1/2 z-20 hidden w-[248px] -translate-y-1/2 md:block">
			<div className="part-card" data-visible={Boolean(part)}>
				{part ? (
					<div key={part.id} className="part-card-content">
						<div className="flex items-center justify-between gap-4">
							<p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7f91af]">
								{active ? "Exploded assembly" : "Component"}
							</p>
							<span className="size-1.5 rounded-full bg-[#92acd4] shadow-[0_0_10px_#7593c2]" />
						</div>
						<h2 className="mt-3 text-[17px] font-medium tracking-[-0.02em] text-[#f5f7fb]">
							{part.name}
						</h2>
						<div className="mt-4 space-y-2.5">
							{part.specs.map((spec) => (
								<div
									key={spec}
									className="flex items-center gap-2 text-[11px] text-[#99a2af]"
								>
									<span className="size-1 rounded-full bg-[#59687e]" />
									{spec}
								</div>
							))}
						</div>
						<div className="mt-5 border-t border-white/[0.07] pt-3 text-[10px] leading-4 text-[#697280]">
							{active
								? "Click again to reassemble."
								: "Click the part to inspect its assembly offset."}
						</div>
					</div>
				) : (
					<div className="flex items-center gap-3 text-xs text-[#707987]">
						<CircleHelp className="size-4" />
						Hover a component to inspect it.
					</div>
				)}
			</div>
		</div>
	);
}

export default function ProductStudio() {
	const [pickerOpen, setPickerOpen] = useState(true);
	const [modelKey, setModelKey] = useState("field-camera");
	const [hoveredPart, setHoveredPart] = useState<ModelPart | null>(null);
	const [activePart, setActivePart] = useState<ModelPart | null>(null);
	const [model, setModel] = useState<THREE.Group | null>(null);
	const [exporting, setExporting] = useState(false);

	const selectModel = useCallback((key: string) => {
		setModelKey(key);
		setHoveredPart(null);
		setActivePart(null);
		setPickerOpen(false);
	}, []);

	const download = useCallback(async () => {
		if (!model) return;
		setExporting(true);
		try {
			const blob = await exportGLB(model);
			downloadBlob(blob, `frame-forge-${modelKey}.glb`);
		} finally {
			setExporting(false);
		}
	}, [model, modelKey]);

	const selectedModel = useMemo(
		() => MODELS.find((item) => item.key === modelKey) ?? MODELS[0],
		[modelKey],
	);
	const detailPart = hoveredPart ?? activePart;

	return (
		<main className="studio-shell">
			<div className="studio-grid" aria-hidden="true" />
			<header className="absolute inset-x-0 top-0 z-30 flex h-[72px] items-center justify-between border-b border-white/[0.07] px-5 md:px-7">
				<Link href="/" className="group flex items-center gap-3">
					<span className="brand-mark">
						<span />
						<span />
						<span />
					</span>
					<span className="text-[13px] font-semibold tracking-[-0.01em] text-[#edf1f7]">
						Frame Forge
					</span>
				</Link>

				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						className="border border-white/[0.08] bg-white/[0.025] text-[#aab2bf] hover:bg-white/[0.07] hover:text-white"
						onClick={() => setPickerOpen(true)}
					>
						<Layers3 />
						Import model
					</Button>
					<Button
						asChild
						className="bg-[#e5ebf5] text-[#13171d] hover:bg-white"
					>
						<Link href="/studio">
							<ImageUp />
							Upload image
						</Link>
					</Button>
				</div>
			</header>

			<section
				aria-label="Interactive 3D product viewer"
				className="absolute inset-0 z-10 cursor-grab touch-none active:cursor-grabbing"
				onPointerLeave={() => setHoveredPart(null)}
			>
				<StudioScene
					autoRotate={false}
					subject={
						<ModelExplorer
							key={modelKey}
							modelKey={modelKey}
							activePart={activePart?.id ?? null}
							hoveredPart={hoveredPart?.id ?? null}
							onActivePartChange={setActivePart}
							onHoveredPartChange={setHoveredPart}
							onReady={setModel}
						/>
					}
				/>
			</section>

			<div className="pointer-events-none absolute left-5 top-[102px] z-20 max-w-[360px] md:left-8">
				<div className="mb-3 flex items-center gap-2">
					<span className="rounded-full border border-[#8fa9d0]/20 bg-[#7892ba]/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#93a9ca]">
						Stylized reconstruction
					</span>
					<span className="text-[10px] text-[#657080]">Ready to inspect</span>
				</div>
				<h1 className="text-[clamp(30px,3.5vw,50px)] font-medium leading-none tracking-[-0.045em] text-[#f3f5f8]">
					{selectedModel.name}
				</h1>
				<p className="mt-3 max-w-[320px] text-[12px] leading-5 text-[#7d8796]">
					Procedural geometry · independent PBR channels · interactive part
					hierarchy
				</p>
			</div>

			<PartCard part={detailPart} active={activePart?.id === detailPart?.id} />

			<div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-5">
				<div className="pointer-events-auto flex w-full max-w-[720px] items-center justify-between gap-5 rounded-2xl border border-white/[0.08] bg-[#101318]/80 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl md:px-5">
					<div className="flex min-w-0 items-center gap-4">
						<div className="hidden size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#93a4bf] sm:flex">
							<MousePointer2 className="size-4" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-[12px] font-medium text-[#dce1e9]">
								Drag to rotate · Scroll to zoom
							</p>
							<p className="mt-0.5 truncate text-[10px] text-[#6e7785]">
								Hover to inspect · Click to explode
							</p>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<div className="hidden items-center gap-2 border-r border-white/[0.08] pr-4 text-[10px] text-[#717b89] md:flex">
							<Rotate3D className="size-3.5" />
							Free 360°
						</div>
						<Button
							size="sm"
							variant="ghost"
							disabled={!model || exporting}
							onClick={download}
							className="text-[#aab4c3] hover:bg-white/[0.07] hover:text-white"
						>
							<Download />
							{exporting ? "Exporting…" : "GLB"}
						</Button>
					</div>
				</div>
			</div>

			<ModelPicker
				open={pickerOpen}
				value={modelKey}
				onClose={() => setPickerOpen(false)}
				onSelect={selectModel}
			/>
		</main>
	);
}
