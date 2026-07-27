// Filesystem-backed job store. Deliberately simple: one directory per job under
// `data/jobs/<id>/`, holding `job.json` and the uploaded `reference` image. The
// filesystem is the single source of truth, so job state survives across
// requests and dev-server reloads (the polling UI reads whatever is on disk).
//
// This is the right amount of persistence for an internal, few-concurrent-jobs
// tool. A real product would swap this for a DB + object storage behind the same
// function signatures.
//
// Server-only: only import this from route handlers and the worker.

import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DATA_ROOT, writeJsonAtomic } from "@/lib/storage";
import type { Job } from "./types";

const JOBS_DIR = path.join(DATA_ROOT, "jobs");

const jobDir = (id: string) => path.join(JOBS_DIR, id);
const jobFile = (id: string) => path.join(jobDir(id), "job.json");
const imageFile = (id: string) => path.join(jobDir(id), "reference");
const modelFile = (id: string) => path.join(jobDir(id), "model.glb");

export async function createJob(input: {
	prompt: string;
	imageBytes: Buffer;
	imageName: string;
	imageType: string;
	totalPasses: number;
}): Promise<Job> {
	const id = randomUUID();
	const now = new Date().toISOString();
	const job: Job = {
		id,
		createdAt: now,
		updatedAt: now,
		status: "queued",
		prompt: input.prompt,
		image: { name: input.imageName, type: input.imageType },
		dispatchedPrompt: null,
		totalPasses: input.totalPasses,
		passes: [],
		result: null,
		error: null,
	};

	await fs.mkdir(jobDir(id), { recursive: true });
	await fs.writeFile(imageFile(id), input.imageBytes);
	await writeJob(job);
	return job;
}

export async function readJob(id: string): Promise<Job | null> {
	try {
		const raw = await fs.readFile(jobFile(id), "utf8");
		return JSON.parse(raw) as Job;
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw err;
	}
}

export async function writeJob(job: Job): Promise<void> {
	job.updatedAt = new Date().toISOString();
	await writeJsonAtomic(jobFile(job.id), job);
}

// Read-modify-write helper so the worker never clobbers a concurrent status
// change. There is one worker per job, so a simple read/mutate/write is enough.
export async function updateJob(
	id: string,
	mutate: (job: Job) => void,
): Promise<Job | null> {
	const job = await readJob(id);
	if (!job) return null;
	mutate(job);
	await writeJob(job);
	return job;
}

export async function listJobs(): Promise<Job[]> {
	let ids: string[];
	try {
		ids = await fs.readdir(JOBS_DIR);
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw err;
	}
	const jobs = await Promise.all(ids.map((id) => readJob(id)));
	return jobs
		.filter((j): j is Job => j !== null)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// The rendered GLB artifact the worker produced for this job, if any.
export async function readModel(id: string): Promise<Buffer | null> {
	try {
		return await fs.readFile(modelFile(id));
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw err;
	}
}

export async function readImage(
	id: string,
): Promise<{ bytes: Buffer; type: string } | null> {
	const job = await readJob(id);
	if (!job?.image) return null;
	try {
		const bytes = await fs.readFile(imageFile(id));
		return { bytes, type: job.image.type };
	} catch (err) {
		if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
		throw err;
	}
}
