"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import StudioScene from "@/components/studio-scene";
import { fitToStage } from "@/lib/models/fit";

// Loads a persisted GLB (the portable share artifact) and renders it in the same
// studio scene as the result viewer. This path depends only on the GLB — never
// on the procedural generator — which is the whole point of persisting GLB.
function SharedModel({ url }: { url: string }) {
	const { scene } = useGLTF(url);
	const object = useMemo(() => {
		const clone = scene.clone(true);
		fitToStage(clone);
		return clone;
	}, [scene]);
	return <primitive object={object} />;
}

export default function ShareViewer({ url }: { url: string }) {
	const subject = useMemo(() => <SharedModel url={url} />, [url]);
	return (
		<div className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing">
			<StudioScene subject={subject} autoRotate />
		</div>
	);
}
