import { describe, expect, test } from "bun:test";
import { createAssistantMessageEventStream, type Model } from "@earendil-works/pi-ai";
import { compact } from "@earendil-works/pi-coding-agent";
import { summarizeCodex } from "./portable-summary.ts";

const model = {
	id: "gpt-test", api: "openai-codex-responses", provider: "openai-codex",
	maxTokens: 4096, contextWindow: 200_000, reasoning: false, input: ["text"],
} as Model<any>;
const preparation = {
	firstKeptEntryId: "keep", tokensBefore: 1000,
	messagesToSummarize: [{ role: "user", content: [{ type: "text", text: "Remember ORCHID-47" }], timestamp: 1 }],
	turnPrefixMessages: [], isSplitTurn: false, previousSummary: undefined,
	fileOps: { read: new Set(), written: new Set(), edited: new Set() },
	settings: { enabled: true, reserveTokens: 1024, keepRecentTokens: 1 },
} as Parameters<typeof compact>[0];

function response(stopReason: "error" | "stop", text: string) {
	return {
		role: "assistant", content: stopReason === "stop" ? [{ type: "text", text }] : [],
		stopReason, ...(stopReason === "error" ? { errorMessage: text } : {}),
		usage: { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
	} as any;
}

describe("portable Codex summary", () => {
	test("uses SSE and retries a transient WebSocket error before saving the summary", async () => {
		let calls = 0;
		const stream = (_model: any, _context: any, options: any) => {
			expect(options.transport).toBe("sse");
			calls++;
			const result = createAssistantMessageEventStream();
			const message = calls === 1 ? response("error", "WebSocket error") : response("stop", "Keep ORCHID-47");
			result.push({ type: "done", reason: message.stopReason, message });
			return result;
		};
		const result = await summarizeCodex(preparation, model, "test-key", undefined, undefined, undefined, undefined, stream);
		expect(result.summary).toContain("ORCHID-47");
		expect(calls).toBe(2);
	});

	test("does not retry permanent summary errors", async () => {
		let calls = 0;
		const stream = () => {
			calls++;
			const result = createAssistantMessageEventStream();
			const message = response("error", "invalid request");
			result.push({ type: "done", reason: message.stopReason, message });
			return result;
		};
		await expect(summarizeCodex(preparation, model, "test-key", undefined, undefined, undefined, undefined, stream))
			.rejects.toThrow("Summarization failed: invalid request");
		expect(calls).toBe(1);
	});
});
