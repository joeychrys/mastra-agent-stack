import type {
  AnySpan,
  ModelGenerationAttributes,
  SpanOutputProcessor,
} from "@mastra/core/observability";
import { SpanType } from "@mastra/core/observability";

export class UsageLogger implements SpanOutputProcessor {
  name = "usage-logger";

  process(span: AnySpan): AnySpan {
    if (span.type !== "model_generation") {
      return span;
    }

    const attrs = span.attributes as ModelGenerationAttributes | undefined;
    if (!attrs?.usage) {
      return span;
    }

    const { inputTokens, outputTokens } = attrs.usage;
    const model = attrs.model ?? "unknown";
    const provider = attrs.provider ?? "unknown";
    const finishReason = attrs.finishReason ?? "unknown";
    const agentRun = span.findParent(SpanType.AGENT_RUN);
    const agentId = agentRun?.entityId ?? span.parent?.entityId ?? "unknown";
    const resourceId = (span.metadata?.resourceId as string | undefined) ?? "unknown";

    const total = (inputTokens ?? 0) + (outputTokens ?? 0);

    const parts = [
      `agent=${agentId}`,
      `resourceId=${resourceId}`,
      `model=${provider}/${model}`,
      `input_tokens=${inputTokens ?? 0}`,
      `output_tokens=${outputTokens ?? 0}`,
      `total_tokens=${total}`,
      `finish=${finishReason}`,
    ];

    console.log(`[usage] ${parts.join(" ")}`);

    return span;
  }

  async shutdown(): Promise<void> {}
}
