"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { disposeObject, fitToStage } from "@/lib/models/fit";
import { buildModel } from "@/lib/models/registry";

export type ModelPart = {
	id: string;
	name: string;
	specs: string[];
	explode: [number, number, number];
};

type SurfaceState = {
	color: THREE.Color;
	intensity: number;
};

function partFromObject(
	object: THREE.Object3D,
	root: THREE.Group,
): ModelPart | null {
	let cursor: THREE.Object3D | null = object;
	while (cursor && cursor.parent !== root) cursor = cursor.parent;
	return (cursor?.userData.part as ModelPart | undefined) ?? null;
}

function preparePartSurfaces(group: THREE.Group) {
	for (const child of group.children) {
		child.traverse((object) => {
			if (!(object instanceof THREE.Mesh)) return;
			const materials = Array.isArray(object.material)
				? object.material
				: [object.material];
			const cloned = materials.map((item) => item.clone());
			object.material = Array.isArray(object.material) ? cloned : cloned[0];

			for (const surface of cloned) {
				if (
					surface instanceof THREE.MeshStandardMaterial ||
					surface instanceof THREE.MeshPhysicalMaterial
				) {
					surface.userData.baseFocus = {
						color: surface.emissive.clone(),
						intensity: surface.emissiveIntensity,
					} satisfies SurfaceState;
				}
			}
		});
	}
}

export default function ModelExplorer({
	modelKey,
	activePart,
	hoveredPart,
	onActivePartChange,
	onHoveredPartChange,
	onReady,
}: {
	modelKey: string;
	activePart: string | null;
	hoveredPart: string | null;
	onActivePartChange: (part: ModelPart | null) => void;
	onHoveredPartChange: (part: ModelPart | null) => void;
	onReady?: (group: THREE.Group) => void;
}) {
	const group = useMemo(() => {
		const next = buildModel(modelKey);
		preparePartSurfaces(next);
		fitToStage(next, modelKey === "gift-box" ? 1.85 : 2.45, -1.03);
		return next;
	}, [modelKey]);
	const restingPositions = useMemo(() => {
		const positions = new Map<string, THREE.Vector3>();
		for (const child of group.children) {
			const part = child.userData.part as ModelPart | undefined;
			if (part) positions.set(part.id, child.position.clone());
		}
		return positions;
	}, [group]);
	const hoveredRef = useRef(hoveredPart);
	const activeRef = useRef(activePart);

	useEffect(() => {
		hoveredRef.current = hoveredPart;
	}, [hoveredPart]);

	useEffect(() => {
		activeRef.current = activePart;
	}, [activePart]);

	useEffect(() => {
		onReady?.(group);
		return () => disposeObject(group);
	}, [group, onReady]);

	useFrame((_, delta) => {
		const positionEase = 1 - Math.exp(-delta * 8.5);
		const surfaceEase = 1 - Math.exp(-delta * 11);

		for (const child of group.children) {
			const part = child.userData.part as ModelPart | undefined;
			if (!part) continue;
			const resting = restingPositions.get(part.id);
			if (!resting) continue;

			const isActive = activeRef.current === part.id;
			const target = new THREE.Vector3(...part.explode)
				.multiplyScalar(isActive ? group.scale.x : 0)
				.add(resting);
			child.position.lerp(target, positionEase);

			const isHovered = hoveredRef.current === part.id;
			child.traverse((object) => {
				if (!(object instanceof THREE.Mesh)) return;
				const materials = Array.isArray(object.material)
					? object.material
					: [object.material];
				for (const surface of materials) {
					if (
						!(
							surface instanceof THREE.MeshStandardMaterial ||
							surface instanceof THREE.MeshPhysicalMaterial
						)
					)
						continue;
					const base = surface.userData.baseFocus as SurfaceState | undefined;
					if (!base) continue;
					const focus = isActive ? 0.14 : isHovered ? 0.07 : base.intensity;
					surface.emissive.lerp(
						isActive || isHovered ? new THREE.Color("#405775") : base.color,
						surfaceEase,
					);
					surface.emissiveIntensity = THREE.MathUtils.lerp(
						surface.emissiveIntensity,
						focus,
						surfaceEase,
					);
				}
			});
		}
	});

	const identify = (event: ThreeEvent<PointerEvent>) => {
		event.stopPropagation();
		const part = partFromObject(event.object, group);
		if (part) onHoveredPartChange(part);
	};

	const toggle = (event: ThreeEvent<MouseEvent>) => {
		event.stopPropagation();
		const part = partFromObject(event.object, group);
		if (!part) return;
		onActivePartChange(activePart === part.id ? null : part);
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: R3F primitive events raycast a 3D object, not a DOM element.
		<primitive
			object={group}
			onClick={toggle}
			onPointerMove={identify}
			onPointerOver={identify}
		/>
	);
}
