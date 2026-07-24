// Procedural desk lamp. Second stand-in factory — metal PBR + one emissive
// element, a jointed arm built from grouped segments (pivot hierarchy).

import * as THREE from "three";

function metal(color: string): THREE.MeshStandardMaterial {
	return new THREE.MeshStandardMaterial({
		color,
		metalness: 0.85,
		roughness: 0.32,
	});
}

export function createDeskLamp(): THREE.Group {
	const group = new THREE.Group();
	group.name = "desk-lamp";

	const shell = metal("#3a4a63");

	// Weighted base.
	const base = new THREE.Mesh(
		new THREE.CylinderGeometry(0.62, 0.7, 0.16, 48),
		shell,
	);
	base.name = "base";
	base.position.y = 0.08;
	base.castShadow = true;
	base.receiveShadow = true;
	group.add(base);

	const collar = new THREE.Mesh(
		new THREE.CylinderGeometry(0.14, 0.18, 0.12, 32),
		shell,
	);
	collar.position.y = 0.2;
	collar.castShadow = true;
	group.add(collar);

	// Lower arm pivots at the base.
	const lowerPivot = new THREE.Group();
	lowerPivot.name = "lower-joint";
	lowerPivot.position.y = 0.24;
	lowerPivot.rotation.z = 0.42;
	group.add(lowerPivot);

	const lowerArm = new THREE.Mesh(
		new THREE.CylinderGeometry(0.05, 0.05, 1.2, 20),
		shell,
	);
	lowerArm.position.y = 0.6;
	lowerArm.castShadow = true;
	lowerPivot.add(lowerArm);

	// Elbow joint sits at the top of the lower arm.
	const upperPivot = new THREE.Group();
	upperPivot.name = "upper-joint";
	upperPivot.position.y = 1.2;
	upperPivot.rotation.z = -1.05;
	lowerPivot.add(upperPivot);

	const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 24), shell);
	elbow.castShadow = true;
	upperPivot.add(elbow);

	const upperArm = new THREE.Mesh(
		new THREE.CylinderGeometry(0.05, 0.05, 1.0, 20),
		shell,
	);
	upperArm.position.y = 0.5;
	upperArm.castShadow = true;
	upperPivot.add(upperArm);

	// Head + shade at the end of the upper arm.
	const head = new THREE.Group();
	head.name = "head";
	head.position.y = 1.0;
	head.rotation.z = -0.5;
	upperPivot.add(head);

	const shade = new THREE.Mesh(
		new THREE.CylinderGeometry(0.16, 0.34, 0.4, 40, 1, true),
		new THREE.MeshStandardMaterial({
			color: "#c94f3d",
			metalness: 0.5,
			roughness: 0.35,
			side: THREE.DoubleSide,
		}),
	);
	shade.castShadow = true;
	head.add(shade);

	// Glowing bulb disc — emissive so it reads as "on" and exercises the
	// emissive channel through the export.
	const bulb = new THREE.Mesh(
		new THREE.CircleGeometry(0.16, 32),
		new THREE.MeshStandardMaterial({
			color: "#fff2cc",
			emissive: "#ffcf7a",
			emissiveIntensity: 1.6,
			roughness: 0.4,
		}),
	);
	bulb.position.y = -0.16;
	bulb.rotation.x = -Math.PI / 2;
	head.add(bulb);

	group.userData.sculptRuntime = {
		pivots: {
			lowerJoint: [0, 0.24, 0],
			upperJoint: "lower-joint > upper-joint",
			head: "upper-joint > head",
		},
	};

	return group;
}
