import type { AgentResult } from "@inngest/agent-kit";

type AssistantContent =
    | string
    | Array<{ type?: string; text?: string }>;

export function lastAssistantTextMessageContent(
    result: AgentResult
): string | undefined {
    const lastAssistantTextMessageIndex = result.output.findLastIndex(
        (message) => message.role === "assistant"
    );

    const message = result.output[lastAssistantTextMessageIndex] as
        | { content?: AssistantContent }
        | undefined;

    if (!message?.content) return undefined;

    return typeof message.content === "string"
        ? message.content
        : message.content.map((c) => c.text ?? "").join("");
}