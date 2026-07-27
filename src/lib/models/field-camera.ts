import * as THREE from "three";

type PartOptions = {
	id: string;
	name: string;
	specs: string[];
	explode: [number, number, number];
};

function seededNoiseTexture(seed = 6143): THREE.CanvasTexture {
	const size = 192;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const context = canvas.getContext("2d");
	if (!context) return new THREE.CanvasTexture(canvas);

	const image = context.createImageData(size, size);
	let state = seed >>> 0;
	for (let pixel = 0; pixel < image.data.length; pixel += 4) {
		state = (state * 1664525 + 1013904223) >>> 0;
		const grain = 104 + (state % 72);
		image.data[pixel] = grain;
		image.data[pixel + 1] = grain;
		image.data[pixel + 2] = grain;
		image.data[pixel + 3] = 255;
	}
	context.putImageData(image, 0, 0);

	const texture = new THREE.CanvasTexture(canvas);
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(3, 2);
	texture.colorSpace = THREE.NoColorSpace;
	return texture;
}

function roundedBoxGeometry(
	width: number,
	height: number,
	depth: number,
	radius: number,
): THREE.ExtrudeGeometry {
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const shape = new THREE.Shape();

	shape.moveTo(-halfWidth + radius, -halfHeight);
	shape.lineTo(halfWidth - radius, -halfHeight);
	shape.quadraticCurveTo(
		halfWidth,
		-halfHeight,
		halfWidth,
		-halfHeight + radius,
	);
	shape.lineTo(halfWidth, halfHeight - radius);
	shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - radius, halfHeight);
	shape.lineTo(-halfWidth + radius, halfHeight);
	shape.quadraticCurveTo(
		-halfWidth,
		halfHeight,
		-halfWidth,
		halfHeight - radius,
	);
	shape.lineTo(-halfWidth, -halfHeight + radius);
	shape.quadraticCurveTo(
		-halfWidth,
		-halfHeight,
		-halfWidth + radius,
		-halfHeight,
	);

	const geometry = new THREE.ExtrudeGeometry(shape, {
		depth,
		bevelEnabled: true,
		bevelSegments: 3,
		bevelSize: Math.min(radius * 0.26, 0.045),
		bevelThickness: Math.min(depth * 0.08, 0.045),
		curveSegments: 8,
	});
	geometry.translate(0, 0, -depth / 2);
	geometry.computeVertexNormals();
	return geometry;
}

function material(
	options: THREE.MeshPhysicalMaterialParameters,
): THREE.MeshPhysicalMaterial {
	return new THREE.MeshPhysicalMaterial({
		side: THREE.DoubleSide,
		...options,
	});
}

function mesh(
	geometry: THREE.BufferGeometry,
	surface: THREE.Material,
	name?: string,
): THREE.Mesh {
	const object = new THREE.Mesh(geometry, surface);
	object.name = name ?? "";
	object.castShadow = true;
	object.receiveShadow = true;
	return object;
}

function part(options: PartOptions): THREE.Group {
	const group = new THREE.Group();
	group.name = options.id;
	group.userData.part = options;
	return group;
}

function cylinder(
	radiusTop: number,
	radiusBottom: number,
	height: number,
	segments = 64,
): THREE.CylinderGeometry {
	const geometry = new THREE.CylinderGeometry(
		radiusTop,
		radiusBottom,
		height,
		segments,
	);
	geometry.rotateX(Math.PI / 2);
	return geometry;
}

function addKnurling(
	parent: THREE.Group,
	radius: number,
	depth: number,
	surface: THREE.Material,
	count = 36,
) {
	const toothGeometry = new THREE.BoxGeometry(0.018, 0.042, depth);
	for (let index = 0; index < count; index += 1) {
		const angle = (index / count) * Math.PI * 2;
		const tooth = mesh(toothGeometry, surface);
		tooth.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
		tooth.rotation.z = angle;
		parent.add(tooth);
	}
}

export function createFieldCamera(): THREE.Group {
	const root = new THREE.Group();
	root.name = "field-camera";

	const grain = seededNoiseTexture();
	const leather = material({
		color: "#292e35",
		metalness: 0.04,
		roughness: 0.86,
		roughnessMap: grain,
		bumpMap: grain,
		bumpScale: 0.025,
	});
	const graphite = material({
		color: "#3b424a",
		metalness: 0.78,
		roughness: 0.32,
	});
	const darkMetal = material({
		color: "#14171b",
		metalness: 0.88,
		roughness: 0.24,
	});
	const silver = material({
		color: "#b9c0c7",
		metalness: 0.9,
		roughness: 0.28,
		clearcoat: 0.18,
		clearcoatRoughness: 0.34,
	});
	const warmGlass = material({
		color: "#182634",
		metalness: 0.05,
		roughness: 0.08,
		transmission: 0.38,
		thickness: 0.16,
		ior: 1.48,
		clearcoat: 1,
		clearcoatRoughness: 0.05,
		transparent: true,
		opacity: 0.86,
	});
	const accent = material({
		color: "#d46949",
		metalness: 0.38,
		roughness: 0.35,
		clearcoat: 0.42,
		clearcoatRoughness: 0.2,
	});

	const chassis = part({
		id: "chassis",
		name: "Magnesium chassis",
		specs: ["Weather-sealed shell", "Textured matte finish", "620 g body"],
		explode: [-0.42, -0.05, -0.18],
	});
	chassis.add(mesh(roundedBoxGeometry(2.38, 1.48, 0.72, 0.18), leather));

	const frontPlate = mesh(
		roundedBoxGeometry(1.12, 1.1, 0.055, 0.11),
		graphite.clone(),
		"lens-mount-plate",
	);
	frontPlate.position.set(0.2, -0.04, 0.397);
	chassis.add(frontPlate);

	const sideSeam = mesh(
		new THREE.BoxGeometry(0.018, 1.02, 0.755),
		darkMetal.clone(),
		"body-parting-line",
	);
	sideSeam.position.set(-0.78, -0.06, 0);
	chassis.add(sideSeam);

	const mark = new THREE.Group();
	mark.name = "maker-mark";
	mark.position.set(-0.7, 0.35, 0.43);
	const markMaterial = silver.clone();
	const markBarA = mesh(
		new THREE.BoxGeometry(0.17, 0.032, 0.016),
		markMaterial,
	);
	const markBarB = mesh(
		new THREE.BoxGeometry(0.032, 0.14, 0.016),
		markMaterial,
	);
	markBarA.position.x = 0.05;
	markBarB.position.y = -0.05;
	mark.add(markBarA, markBarB);
	chassis.add(mark);
	root.add(chassis);

	const lens = part({
		id: "lens",
		name: "35 mm prime lens",
		specs: ["F1.8–F16 aperture", "7-element optic", "49 mm filter thread"],
		explode: [0.08, 0.02, 0.9],
	});
	lens.position.set(0.2, -0.04, 0.53);
	const mount = mesh(cylinder(0.49, 0.49, 0.12), silver.clone(), "metal-mount");
	lens.add(mount);

	const barrel = mesh(
		cylinder(0.44, 0.47, 0.5),
		darkMetal.clone(),
		"lens-barrel",
	);
	barrel.position.z = 0.28;
	lens.add(barrel);

	const focusRing = new THREE.Group();
	focusRing.position.z = 0.47;
	focusRing.add(
		mesh(cylinder(0.455, 0.455, 0.18), graphite.clone(), "focus-ring"),
	);
	addKnurling(focusRing, 0.458, 0.19, darkMetal.clone(), 44);
	lens.add(focusRing);

	const frontRing = mesh(
		cylinder(0.405, 0.405, 0.055),
		silver.clone(),
		"filter-ring",
	);
	frontRing.position.z = 0.6;
	lens.add(frontRing);

	const optic = mesh(
		cylinder(0.34, 0.34, 0.035),
		warmGlass.clone(),
		"front-element",
	);
	optic.position.z = 0.64;
	lens.add(optic);

	const iris = mesh(
		cylinder(0.19, 0.19, 0.012, 10),
		material({
			color: "#050607",
			metalness: 0.16,
			roughness: 0.18,
		}),
		"aperture",
	);
	iris.position.z = 0.655;
	lens.add(iris);
	root.add(lens);

	const grip = part({
		id: "grip",
		name: "Ergonomic grip",
		specs: [
			"Moulded elastomer",
			"Dual detent controls",
			"Battery access below",
		],
		explode: [0.64, -0.12, -0.06],
	});
	grip.position.set(1.04, -0.08, 0.08);
	const gripShell = mesh(
		roundedBoxGeometry(0.46, 1.18, 0.66, 0.16),
		leather.clone(),
		"grip-shell",
	);
	gripShell.rotation.y = -0.06;
	grip.add(gripShell);
	const gripInset = mesh(
		roundedBoxGeometry(0.06, 0.68, 0.48, 0.025),
		darkMetal.clone(),
		"finger-rest",
	);
	gripInset.position.set(0.225, -0.12, 0.02);
	grip.add(gripInset);
	root.add(grip);

	const topPlate = part({
		id: "top-plate",
		name: "Control deck",
		specs: [
			"Brushed alloy plate",
			"Hot-shoe mount",
			"Low-profile status display",
		],
		explode: [0, 0.58, -0.08],
	});
	topPlate.position.y = 0.79;
	const plate = mesh(
		roundedBoxGeometry(1.66, 0.17, 0.66, 0.075),
		graphite.clone(),
		"top-plate",
	);
	plate.position.x = -0.16;
	topPlate.add(plate);

	const hotShoe = mesh(
		new THREE.BoxGeometry(0.38, 0.05, 0.34),
		silver.clone(),
		"hot-shoe",
	);
	hotShoe.position.set(-0.2, 0.12, -0.02);
	topPlate.add(hotShoe);
	const shoeSlot = mesh(
		new THREE.BoxGeometry(0.23, 0.055, 0.22),
		darkMetal.clone(),
		"hot-shoe-slot",
	);
	shoeSlot.position.set(-0.2, 0.15, 0.01);
	topPlate.add(shoeSlot);

	const display = mesh(
		roundedBoxGeometry(0.38, 0.08, 0.24, 0.025),
		material({
			color: "#58726f",
			emissive: "#87b7ad",
			emissiveIntensity: 0.16,
			metalness: 0,
			roughness: 0.22,
			clearcoat: 0.7,
		}),
		"status-display",
	);
	display.position.set(0.45, 0.115, 0);
	display.rotation.x = -Math.PI / 2;
	topPlate.add(display);
	root.add(topPlate);

	const controls = part({
		id: "controls",
		name: "Exposure controls",
		specs: ["Machined mode dial", "Two-stage shutter", "±3 EV compensation"],
		explode: [0.4, 0.44, 0.26],
	});
	controls.position.set(0.58, 0.94, 0.04);
	const dial = mesh(
		new THREE.CylinderGeometry(0.2, 0.2, 0.12, 48),
		silver.clone(),
		"mode-dial",
	);
	controls.add(dial);
	addKnurling(controls, 0.205, 0.05, darkMetal.clone(), 32);
	const dialCap = mesh(
		new THREE.CylinderGeometry(0.155, 0.155, 0.13, 48),
		graphite.clone(),
		"dial-cap",
	);
	dialCap.position.y = 0.018;
	controls.add(dialCap);
	const shutter = mesh(
		new THREE.CylinderGeometry(0.075, 0.08, 0.11, 32),
		accent.clone(),
		"shutter-button",
	);
	shutter.position.set(0.46, 0.01, 0.02);
	controls.add(shutter);
	root.add(controls);

	const viewfinder = part({
		id: "viewfinder",
		name: "Hybrid viewfinder",
		specs: ["3.69M-dot OLED", "0.74× magnification", "Eye sensor"],
		explode: [-0.18, 0.38, -0.45],
	});
	viewfinder.position.set(-0.54, 0.69, -0.21);
	const finderShell = mesh(
		roundedBoxGeometry(0.5, 0.42, 0.52, 0.1),
		graphite.clone(),
		"viewfinder-housing",
	);
	viewfinder.add(finderShell);
	const finderGlass = mesh(
		roundedBoxGeometry(0.29, 0.19, 0.025, 0.055),
		warmGlass.clone(),
		"viewfinder-glass",
	);
	finderGlass.position.z = 0.285;
	viewfinder.add(finderGlass);
	root.add(viewfinder);

	const strapLug = mesh(
		new THREE.TorusGeometry(0.09, 0.022, 12, 32),
		silver.clone(),
		"strap-lug",
	);
	strapLug.position.set(-1.23, 0.18, 0);
	strapLug.rotation.y = Math.PI / 2;
	chassis.add(strapLug);

	root.userData.sculptRuntime = {
		pivots: {
			lensMount: [0.2, -0.04, 0.53],
			modeDial: [0.58, 0.94, 0.04],
		},
		sockets: {
			hotShoe: [-0.36, 0.91, -0.02],
			strapLug: [-1.23, 0.18, 0],
		},
	};

	return root;
}
