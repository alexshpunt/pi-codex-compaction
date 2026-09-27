import { compact } from "@earendil-works/pi-coding-agent";
import { streamSimple } from "@earendil-works/pi-ai/compat";

/** Generate a portable Pi summary over HTTP SSE instead of the Codex WebSocket. */
export function summarizeCodex(
	preparation: Parameters<typeof compact>[0],
	model: Parameters<typeof compact>[1],
	apiKey: Parameters<typeof compact>[2],
	headers: Parameters<typeof compact>[3],
	customInstructions: Parameters<typeof compact>[4],
	signal: Parameters<typeof compact>[5],
	thinkingLevel: Parameters<typeof compact>[6],
	streamFn: NonNullable<Parameters<typeof compact>[7]> = streamSimple,
): ReturnType<typeof compact> {
	return compact(preparation, model, apiKey, headers, customInstructions, signal, thinkingLevel,
		(model, context, options) => streamFn(model, context, { ...options, transport: "sse" }),
		undefined, { enabled: true, maxRetries: 2, baseDelayMs: 500 });
}
