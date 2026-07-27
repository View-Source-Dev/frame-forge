"use client";

import {
	ContactShadows,
	Environment,
	Lightformer,
	TrackballControls,
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { type ReactNode, Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";

// --- Default scene settings (ported from the 3d-scene-demo reference) --------

const CAMERA = {
	far: 40,
	fov: 34,
	near: 0.1,
	position: [3.15, 1.55, 4.8] as const,
};

const CONTROLS = {
	dampingFactor: 0.06,
	maxDistance: 8,
	minDistance: 3.5,
	rotateSpeed: 0.55,
	zoomSpeed: 0.65,
};

function useReducedMotion() {
	const [reducedMotion, setReducedMotion] = useState(false);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setReducedMotion(mediaQuery.matches);
		update();
		mediaQuery.addEventListener("change", update);
		return () => mediaQuery.removeEventListener("change", update);
	}, []);

	return reducedMotion;
}

function StudioLighting() {
	return (
		<>
			<hemisphereLight color="#d8e4ff" groundColor="#08090c" intensity={0.52} />
			<directionalLight
				castShadow
				color="#f1f5ff"
				intensity={3.5}
				position={[4.5, 6.5, 5]}
				shadow-bias={-0.0001}
				shadow-camera-bottom={-3}
				shadow-camera-far={18}
				shadow-camera-left={-3}
				shadow-camera-near={0.5}
				shadow-camera-right={3}
				shadow-camera-top={3}
				shadow-mapSize-height={2048}
				shadow-mapSize-width={2048}
			/>
			<directionalLight
				color="#86a9e8"
				intensity={0.85}
				position={[-5, 1.5, -4]}
			/>
			<directionalLight
				color="#ffd0a0"
				intensity={0.65}
				position={[4, -1, -3]}
			/>

			{/* A one-frame softbox environment gives controlled, studio-like
			    reflections without a network-fetched HDRI. */}
			<Environment frames={1} resolution={256}>
				<Lightformer
					color="#f4f7ff"
					intensity={2.1}
					position={[0, 5, 1]}
					rotation={[Math.PI / 2, 0, 0]}
					scale={[8, 3, 1]}
				/>
				<Lightformer
					color="#a8c4ff"
					intensity={1.25}
					position={[-5, 1, 0]}
					rotation={[0, Math.PI / 2, 0]}
					scale={[3, 5, 1]}
				/>
				<Lightformer
					color="#ffcf9c"
					intensity={1}
					position={[5, 0, 1]}
					rotation={[0, -Math.PI / 2, 0]}
					scale={[2, 4, 1]}
				/>
				<Lightformer
					color="#313946"
					intensity={0.7}
					position={[0, -3, 2]}
					rotation={[-Math.PI / 2, 0, 0]}
					scale={[7, 2, 1]}
				/>
			</Environment>
		</>
	);
}

function SceneControls() {
	return (
		<TrackballControls
			makeDefault
			dynamicDampingFactor={CONTROLS.dampingFactor}
			maxDistance={CONTROLS.maxDistance}
			minDistance={CONTROLS.minDistance}
			noPan
			rotateSpeed={CONTROLS.rotateSpeed}
			target={[0, 0, 0]}
			zoomSpeed={CONTROLS.zoomSpeed}
		/>
	);
}

// A simple faceted placeholder mesh — a neutral stand-in for a reconstructed
// object while the scene has no imported models.
function PlaceholderMesh({ reducedMotion }: { reducedMotion: boolean }) {
	const meshRef = useRef<THREE.Mesh>(null);

	useFrame((_, delta) => {
		if (reducedMotion || !meshRef.current) return;
		meshRef.current.rotation.y += delta * 0.25;
	});

	return (
		<mesh ref={meshRef} castShadow receiveShadow>
			<icosahedronGeometry args={[1.25, 1]} />
			<meshPhysicalMaterial
				clearcoat={0.6}
				clearcoatRoughness={0.25}
				color="#c7d2e6"
				envMapIntensity={0.9}
				flatShading
				metalness={0.6}
				roughness={0.28}
			/>
		</mesh>
	);
}

// The studio scene furniture (lighting, environment, shadows, controls) is
// shared. By default it shows a neutral placeholder mesh as a backdrop; pass a
// `subject` (any R3F content) to render a real model in the same staged scene —
// this is how the result viewer and the share page reuse the exact lighting.
export default function StudioScene({
	subject,
}: {
	subject?: ReactNode;
	autoRotate?: boolean;
}) {
	const reducedMotion = useReducedMotion();

	return (
		<Canvas
			camera={{
				far: CAMERA.far,
				fov: CAMERA.fov,
				near: CAMERA.near,
				position: [...CAMERA.position],
			}}
			dpr={[1, 1.6]}
			gl={{
				alpha: true,
				antialias: true,
				powerPreference: "high-performance",
				stencil: false,
			}}
			onCreated={({ gl }) => {
				gl.shadowMap.type = THREE.PCFShadowMap;
				gl.toneMapping = THREE.ACESFilmicToneMapping;
				gl.toneMappingExposure = 1.12;
			}}
			shadows
		>
			<fog attach="fog" args={["#090b0f", 7, 13]} />
			<StudioLighting />

			<Suspense fallback={null}>
				{subject ?? <PlaceholderMesh reducedMotion={reducedMotion} />}
			</Suspense>

			{/* Render once: a soft presence shadow, not a hard physical floor. */}
			<ContactShadows
				blur={3.2}
				color="#020305"
				far={2.5}
				frames={1}
				opacity={0.42}
				position={[0, -1.4, 0]}
				resolution={512}
				scale={6}
			/>

			<SceneControls />
		</Canvas>
	);
}
