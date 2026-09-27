import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CONFIG_DIR_NAME } from "@earendil-works/pi-coding-agent";

export interface CompactionConfig {
	autoCompact: boolean;
	thresholdRatio: number;
	/** Maximum total HTTPS attempts for each native checkpoint and text summary. */
	maxAttempts: number;
}

const DEFAULT_CONFIG: CompactionConfig = {
	autoCompact: true,
	thresholdRatio: 0.9,
	maxAttempts: 5,
};

function readConfig(path: string): Partial<CompactionConfig> {
	if (!existsSync(path)) return {};
	try {
		const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
		return {
			...(typeof parsed.autoCompact === "boolean" ? { autoCompact: parsed.autoCompact } : {}),
			...(Number.isSafeInteger(parsed.maxAttempts) && (parsed.maxAttempts as number) >= 1
				&& (parsed.maxAttempts as number) <= 20
				? { maxAttempts: parsed.maxAttempts as number } : {}),
			...(
				typeof parsed.thresholdRatio === "number" && parsed.thresholdRatio > 0 && parsed.thresholdRatio < 1
					? { thresholdRatio: parsed.thresholdRatio }
					: {}
			),
		};
	} catch {
		return {};
	}
}

export function loadCompactionConfig(cwd: string, projectTrusted: boolean): CompactionConfig {
	const globalConfig = readConfig(join(homedir(), CONFIG_DIR_NAME, "agent", "pi-codex-compaction.json"));
	const projectConfig = projectTrusted
		? readConfig(join(cwd, CONFIG_DIR_NAME, "pi-codex-compaction.json"))
		: {};
	return { ...DEFAULT_CONFIG, ...globalConfig, ...projectConfig };
}
