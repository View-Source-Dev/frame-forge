import StudioScene from "@/components/studio-scene";

// Layered gradient backdrop (ported from the reference scene, expressed inline
// instead of a CSS module).
const PAGE_BACKGROUND =
	"radial-gradient(ellipse 58% 78% at 68% 43%, rgb(70 86 110 / 42%) 0, rgb(25 31 41 / 28%) 38%, transparent 70%)," +
	"radial-gradient(ellipse 44% 54% at 77% 30%, rgb(169 190 224 / 8%) 0, transparent 72%)," +
	"linear-gradient(145deg, #111419 0%, #0b0d11 48%, #07080a 100%)";

const GRID_BACKGROUND =
	"linear-gradient(rgb(218 229 255 / 3.5%) 1px, transparent 1px)," +
	"linear-gradient(90deg, rgb(218 229 255 / 3.5%) 1px, transparent 1px)";

const SPOT_BACKGROUND =
	"radial-gradient(circle, rgb(169 190 224 / 13%) 0, rgb(87 106 139 / 7%) 34%, transparent 68%)";

export default function Home() {
	return (
		<section
			aria-labelledby="hero-title"
			className="relative isolate min-h-dvh flex-1 overflow-hidden text-[#f2f3f5]"
			style={{ background: PAGE_BACKGROUND }}
		>
			{/* Grid overlay */}
			<div
				aria-hidden="true"
				className="absolute inset-0 z-0 bg-center mask-[radial-gradient(ellipse_at_68%_45%,black,transparent_72%)]"
				style={{
					backgroundImage: GRID_BACKGROUND,
					backgroundSize: "88px 88px",
				}}
			/>
			{/* Soft spotlight glow */}
			<div
				aria-hidden="true"
				className="absolute left-[68%] top-[42%] z-0 aspect-square w-[min(58vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[18px]"
				style={{ background: SPOT_BACKGROUND }}
			/>

			{/* 3D scene */}
			<div
				aria-label="Interactive 3D studio scene"
				className="absolute inset-0 z-1 cursor-grab touch-none active:cursor-grabbing"
				role="img"
			>
				<StudioScene />
			</div>

			{/* Hero copy — the product goal */}
			<header className="pointer-events-none absolute left-[clamp(24px,5vw,96px)] top-[clamp(64px,12vh,132px)] z-3 w-[min(92vw,460px)]">
				<p className="mb-5 text-[10px] font-bold uppercase tracking-[0.24em] text-[#858c98]">
					Frame Forge · Image → Mesh
				</p>
				<h1
					id="hero-title"
					className="text-balance text-[clamp(44px,6vw,88px)] font-normal leading-[0.92] tracking-tighter"
				>
					Turn images into 3D meshes.
				</h1>
				<p className="mt-6 max-w-95 text-pretty text-sm leading-[1.62] text-[#a9b0bd]">
					Upload a product design, add a few prompts, and Frame Forge
					reconstructs it as a production-ready Three.js mesh — built in code,
					no model files.
				</p>

			</header>
		</section>
	);
}
