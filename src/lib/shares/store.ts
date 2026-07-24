// Share store. A share is the portable, self-contained form of a result: the
// exported GLB plus a little metadata. Per the TODO we persist the *exported
// GLB* (produced client-side by the viewer) rather than the procedural source,
// so a shared link never re-runs the expensive pipeline and never depends on
// the generator code still existing.
//
// Server-only: only import from route handlers.

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_ROOT = path.join(process.cwd(), "data");
const SHARES_DIR = path.join(DATA_ROOT, "shares");

const shareDir = (uuid: string) => path.join(SHARES_DIR, uuid);
const metaFile = (uuid: string) => path.join(shareDir(uuid), "meta.json");
const modelFile = (uuid: string) => path.join(shareDir(uuid), "model.glb");

export interface ShareMeta {
	uuid: string;
	jobId: string;
	title: string;
	outcome: string;
	createdAt: string;
}

export async function createShare(input: {
	jobId: string;
	title: string;
	outcome: string;
	glb: Buffer;
}): Promise<ShareMeta> {
	const uuid = randomUUID();
	const meta: ShareMeta = {
		uuid,
		jobId: input.jobId,
		title: input.title,
		outcome: input.outcome,
		createdAt: new Date().toISOString(),
	};
	await fs.mkdir(shareDir(uuid), { recursive: true });
	await fs.writeFile(modelFile(uuid), input.glb);
	await fs.writeFile(metaFile(uuid), JSON.stringify(meta, null, 2));
	return meta;
}

export async function readShareMeta(uuid: string): Promise<ShareMeta | null> {
	try {
		const raw = await fs.readFile(metaFile(uuid), "utf8");
		return JSON.parse(raw) as ShareMeta;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw err;
	}
}

export async function readShareModel(uuid: string): Promise<Buffer | null> {
	try {
		return await fs.readFile(modelFile(uuid));
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw err;
	}
}
