import { promises as fs } from "node:fs";
import path from "node:path";

const configuredRoot = process.env.FORGE_DATA_DIR?.trim();

// In production the web and worker containers mount the same durable volume at
// this path. Locally it falls back to <project>/data.
export const DATA_ROOT = configuredRoot
	? path.resolve(configuredRoot)
	: path.join(process.cwd(), "data");

// A reader should see either the previous complete JSON file or the next one,
// never a partially-written file if the process/container stops mid-write.
export async function writeJsonAtomic(
	target: string,
	value: unknown,
): Promise<void> {
	const directory = path.dirname(target);
	const temporary = path.join(
		directory,
		`.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`,
	);

	await fs.mkdir(directory, { recursive: true });
	try {
		await fs.writeFile(temporary, JSON.stringify(value, null, 2));
		await fs.rename(temporary, target);
	} catch (error) {
		await fs.rm(temporary, { force: true }).catch(() => undefined);
		throw error;
	}
}
