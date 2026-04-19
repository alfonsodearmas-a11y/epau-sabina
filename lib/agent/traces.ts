import type { AgentTraceRole, Prisma, PrismaClient } from '@prisma/client';

type TraceDraft = Omit<Prisma.AgentTraceCreateManyInput, 'stepIndex'> & {
  stepIndex?: number;
};

export class TurnTraceRecorder {
  private drafts: TraceDraft[] = [];
  private step = 0;

  constructor(
    private prisma: PrismaClient,
    private sessionId: string,
    private userEmail: string,
    private turnIndex: number,
  ) {}

  private nextStep(): number {
    return this.step++;
  }

  user(content: unknown, surface: string) {
    this.drafts.push({
      sessionId: this.sessionId,
      userEmail: this.userEmail,
      turnIndex: this.turnIndex,
      stepIndex: this.nextStep(),
      role: 'user',
      content: withSurface(content, surface),
    });
  }

  toolCall(args: { toolName: string; toolCallId: string; input: unknown }) {
    this.drafts.push({
      sessionId: this.sessionId,
      userEmail: this.userEmail,
      turnIndex: this.turnIndex,
      stepIndex: this.nextStep(),
      role: 'tool_call',
      toolName: args.toolName,
      toolCallId: args.toolCallId,
      content: { input: args.input } as Prisma.InputJsonValue,
    });
  }

  toolResult(args: {
    toolName: string;
    toolCallId: string;
    output: unknown;
    latencyMs: number;
    errorCode?: string;
    errorDetail?: string;
  }) {
    this.drafts.push({
      sessionId: this.sessionId,
      userEmail: this.userEmail,
      turnIndex: this.turnIndex,
      stepIndex: this.nextStep(),
      role: 'tool_result',
      toolName: args.toolName,
      toolCallId: args.toolCallId,
      content: { output: args.output } as Prisma.InputJsonValue,
      latencyMs: args.latencyMs,
      errorCode: args.errorCode,
      errorDetail: args.errorDetail,
    });
  }

  assistant(args: {
    text: string;
    contentBlocks?: unknown;
    surface: string;
    tokenCountInput?: number;
    tokenCountOutput?: number;
    modelId?: string;
    promptCacheHit?: boolean;
    stopReason?: string;
    latencyMs?: number;
  }) {
    this.drafts.push({
      sessionId: this.sessionId,
      userEmail: this.userEmail,
      turnIndex: this.turnIndex,
      stepIndex: this.nextStep(),
      role: 'assistant',
      content: {
        text: args.text,
        contentBlocks: args.contentBlocks,
        surface: args.surface,
      } as Prisma.InputJsonValue,
      tokenCountInput: args.tokenCountInput,
      tokenCountOutput: args.tokenCountOutput,
      modelId: args.modelId,
      promptCacheHit: args.promptCacheHit,
      stopReason: args.stopReason,
      latencyMs: args.latencyMs,
    });
  }

  systemEvent(args: { kind: string; detail?: unknown; errorCode?: string; errorDetail?: string }) {
    this.drafts.push({
      sessionId: this.sessionId,
      userEmail: this.userEmail,
      turnIndex: this.turnIndex,
      stepIndex: this.nextStep(),
      role: 'system_event',
      content: { kind: args.kind, detail: args.detail } as Prisma.InputJsonValue,
      errorCode: args.errorCode,
      errorDetail: args.errorDetail,
    });
  }

  async flush(): Promise<void> {
    if (!this.drafts.length) return;
    const data = this.drafts.map((d) => ({
      ...d,
      stepIndex: d.stepIndex ?? 0,
    })) as Prisma.AgentTraceCreateManyInput[];
    this.drafts = [];
    try {
      await this.prisma.agentTrace.createMany({ data });
    } catch (err) {
      process.stderr.write(
        `[trace-flush-failed] session=${this.sessionId} turn=${this.turnIndex} err=${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }

  get count(): number {
    return this.drafts.length;
  }
}

function withSurface(content: unknown, surface: string): Prisma.InputJsonValue {
  if (content && typeof content === 'object') {
    return { ...(content as Record<string, unknown>), surface } as Prisma.InputJsonValue;
  }
  return { text: String(content ?? ''), surface } as Prisma.InputJsonValue;
}

export type { AgentTraceRole };
