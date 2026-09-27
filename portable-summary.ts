import { compact } from "@earendil-works/pi-coding-agent";
import { streamSimple } from "@earendil-works/pi-ai/compat";

/** Safe metadata for one text-summary HTTPS request or retry. */
export type SummaryEvent = {
	state: "attempt" | "response" | "retry";
	attempt: number;
	httpStatus?: number;
	requestId?: string;
	error?: string;
};

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
	onEvent?: (event: SummaryEvent) => void,
	maxAttempts = 5,
): ReturnType<typeof compact> {
	let attempt = 0;
	return compact(preparation, model, apiKey, headers, customInstructions, signal, thinkingLevel,
		(model, context, options) => {
			attempt++;
			onEvent?.({ state: "attempt", attempt });
			return streamFn(model, context, {
				...options, transport: "sse",
				onResponse: async (response, responseModel) => {
					onEvent?.({ state: "response", attempt, httpStatus: response.status,
						requestId: response.headers["x-request-id"] });
					await options.onResponse?.(response, responseModel);
				},
			});
		},
		undefined, { enabled: true, maxRetries: maxAttempts - 1, baseDelayMs: 500 }, {
			onRetryScheduled: (_attempt, _maxAttempts, _delayMs, error) =>
				onEvent?.({ state: "retry", attempt: attempt + 1, error }),
		});
}
