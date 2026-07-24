import * as THREE from "three";

// Normalize any model (a factory group or a loaded GLB scene) so it frames
// consistently in the studio scene: uniform-scaled to a target size, centered
// horizontally, and seated just above the contact-shadow plane.
export function fitToStage(
	object: THREE.Object3D,
	targetSize = 2.2,
	groundY = -1.1,
): void {
	// Reset first so re-fitting an already-fitted object is idempotent.
	object.position.set(0, 0, 0);
	object.scale.setScalar(1);
	object.updateMatrixWorld(true);

	const box = new THREE.Box3().setFromObject(object);
	if (box.isEmpty()) return;

	const size = new THREE.Vector3();
	box.getSize(size);
	const center = new THREE.Vector3();
	box.getCenter(center);

	const maxDim = Math.max(size.x, size.y, size.z) || 1;
	const scale = targetSize / maxDim;
	object.scale.setScalar(scale);

	// Center X/Z; seat the bottom of the (scaled) bounds at groundY.
	object.position.set(
		-center.x * scale,
		groundY - box.min.y * scale,
		-center.z * scale,
	);
}

// Free GPU resources when a model leaves the scene (geometries, materials, and
// any textures they reference). Prevents leaks as the viewer mounts/unmounts.
export function disposeObject(object: THREE.Object3D): void {
	object.traverse((obj) => {
		const mesh = obj as THREE.Mesh;
		if (!mesh.isMesh) return;
		mesh.geometry?.dispose();
		const materials = Array.isArray(mesh.material)
			? mesh.material
			: [mesh.material];
		for (const material of materials) {
			if (!material) continue;
			for (const value of Object.values(material)) {
				if (value instanceof THREE.Texture) value.dispose();
			}
			material.dispose();
		}
	});
}
