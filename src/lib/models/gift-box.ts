// Procedural gift box. A stand-in for a real `createObjectModel.ts` emitted by
// the img2threejs skill — built the way the skill builds: primitives, a keyed
// hierarchy, independent PBR channels, and a generated canvas texture (so the
// GLB export path has real baked textures to round-trip).

import * as THREE from "three";

// A tiled wrapping-paper pattern drawn to a canvas. Canvas textures export into
// GLB as embedded images, which is exactly the "bake procedural textures" case
// the exporter has to survive.
function makeWrappingTexture(): THREE.Texture {
	const size = 256;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) return new THREE.Texture();

	ctx.fillStyle = "#8f1d2d";
	ctx.fillRect(0, 0, size, size);

	// Diagonal ribbon stripes.
	ctx.strokeStyle = "#b33545";
	ctx.lineWidth = 10;
	for (let i = -size; i < size * 2; i += 44) {
		ctx.beginPath();
		ctx.moveTo(i, 0);
		ctx.lineTo(i + size, size);
		ctx.stroke();
	}

	// Scattered dots between the stripes.
	ctx.fillStyle = "#f2c9a0";
	for (let y = 22; y < size; y += 44) {
		for (let x = 22; x < size; x += 44) {
			ctx.beginPath();
			ctx.arc(x, y, 4, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(2, 2);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.anisotropy = 4;
	return texture;
}

function ribbonMaterial(): THREE.Material {
	return new THREE.MeshPhysicalMaterial({
		color: "#e9c46a",
		metalness: 0.35,
		roughness: 0.28,
		clearcoat: 0.6,
		clearcoatRoughness: 0.3,
		sheen: 0.4,
	});
}

export function createGiftBox(): THREE.Group {
	const group = new THREE.Group();
	group.name = "gift-box";

	const paper = makeWrappingTexture();
	const paperMaterial = new THREE.MeshPhysicalMaterial({
		map: paper,
		roughness: 0.62,
		metalness: 0.0,
		clearcoat: 0.25,
		clearcoatRoughness: 0.5,
	});

	// Box body.
	const body = new THREE.Mesh(
		new THREE.BoxGeometry(1.4, 1.0, 1.4),
		paperMaterial,
	);
	body.name = "body";
	body.castShadow = true;
	body.receiveShadow = true;
	group.add(body);

	// Lid — a slightly oversized cap sitting on top.
	const lid = new THREE.Mesh(
		new THREE.BoxGeometry(1.52, 0.3, 1.52),
		paperMaterial.clone(),
	);
	lid.name = "lid";
	lid.position.y = 0.63;
	lid.castShadow = true;
	lid.receiveShadow = true;
	group.add(lid);

	// Two ribbon straps crossing over the top and down the sides.
	const strapMat = ribbonMaterial();
	const strapX = new THREE.Mesh(
		new THREE.BoxGeometry(1.6, 1.38, 0.26),
		strapMat,
	);
	strapX.name = "ribbon-x";
	strapX.position.y = 0.05;
	strapX.castShadow = true;
	group.add(strapX);

	const strapZ = new THREE.Mesh(
		new THREE.BoxGeometry(0.26, 1.38, 1.6),
		strapMat,
	);
	strapZ.name = "ribbon-z";
	strapZ.position.y = 0.05;
	strapZ.castShadow = true;
	group.add(strapZ);

	// Bow: two loops + a center knot, parented so the whole bow can be posed.
	const bow = new THREE.Group();
	bow.name = "bow";
	bow.position.y = 0.82;

	const loopGeo = new THREE.TorusGeometry(0.24, 0.075, 16, 40);
	const loopL = new THREE.Mesh(loopGeo, strapMat);
	loopL.rotation.set(Math.PI / 2, 0, 0.5);
	loopL.position.set(-0.2, 0.06, 0);
	loopL.scale.set(1, 0.7, 1);
	loopL.castShadow = true;
	bow.add(loopL);

	const loopR = new THREE.Mesh(loopGeo, strapMat);
	loopR.rotation.set(Math.PI / 2, 0, -0.5);
	loopR.position.set(0.2, 0.06, 0);
	loopR.scale.set(1, 0.7, 1);
	loopR.castShadow = true;
	bow.add(loopR);

	const knot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), strapMat);
	knot.castShadow = true;
	bow.add(knot);

	group.add(bow);

	// Action-ready runtime hierarchy: pivots the skill contract expects so the
	// lid could hinge open and the bow could be detached.
	group.userData.sculptRuntime = {
		pivots: { lid: [0, 0.63, 0] },
		sockets: { bowMount: [0, 0.82, 0] },
	};

	return group;
}
