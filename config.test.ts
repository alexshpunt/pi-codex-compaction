import { afterEach, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadCompactionConfig } from "./config.ts";

const dirs: string[] = [];
afterEach(() => {
	for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function projectWithConfig(value: unknown): string {
	mkdirSync(".tmp", { recursive: true });
	const cwd = mkdtempSync(join(process.cwd(), ".tmp", "config-"));
	dirs.push(cwd);
	mkdirSync(join(cwd, ".pi"));
	writeFileSync(join(cwd, ".pi", "pi-codex-compaction.json"), JSON.stringify(value));
	return cwd;
}

test("uses five attempts unless a trusted project changes the limit", () => {
	const cwd = projectWithConfig({ maxAttempts: 1 });
	expect(loadCompactionConfig(cwd, false).maxAttempts).toBe(5);
	expect(loadCompactionConfig(cwd, true).maxAttempts).toBe(1);
});

test("ignores invalid attempt limits", () => {
	for (const value of [0, -1, 1.5, "5", null, 21]) {
		const cwd = projectWithConfig({ maxAttempts: value });
		expect(loadCompactionConfig(cwd, true).maxAttempts).toBe(5);
	}
});
