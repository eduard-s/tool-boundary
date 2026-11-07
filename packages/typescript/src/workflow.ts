import { createRequire } from 'node:module';
import { WorkflowAgent } from '@ai-sdk/workflow';
import { stepCountIs, tool } from 'ai';
import { ZodError, type ZodType } from 'zod';
import { compareValues, makeObservation, makeReport, withTimeout,
  type Allowance, type Json, type Observation, type ProbeReport } from './core.js';

const require = createRequire(import.meta.url);

export interface WorkflowProbeOptions {
  caseId: string;
  toolName: string;
  arguments: Record<string, Json>;
  inputSchema: ZodType;
  stubResult?: Json;
  makeTool?: (execute: (args: any) => Promise<any>) => any;
  timeoutMs?: number;
  allowances?: Allowance[];
}

function fakeModel(toolName: string, input: string): any {
  let call = 0;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };
  return {
    specificationVersion: 'v4', provider: 'tool-boundary', modelId: 'fake', supportedUrls: {},
    async doStream() {
      const parts = call++ === 0
        ? [
            { type: 'tool-call', toolCallId: 'c1', toolName, input },
            { type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage },
          ]
        : [
            { type: 'text-start', id: 't' },
            { type: 'text-delta', id: 't', delta: 'ok' },
            { type: 'text-end', id: 't' },
            { type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage },
          ];
      return {
        stream: new ReadableStream({
          start(controller) {
            for (const part of parts) controller.enqueue(part);
            controller.close();
          },
        }),
      };
    },
  };
}

export async function probeWorkflowTool(options: WorkflowProbeOptions): Promise<ProbeReport> {
  const dependencies = {
    '@ai-sdk/workflow': require('@ai-sdk/workflow/package.json').version as string,
    ai: require('ai/package.json').version as string,
    zod: require('zod/package.json').version as string,
  };
  const observations: Observation[] = [];
  let called = false;
  let captured: Json | undefined;
  try {
    compareValues(options.arguments, options.arguments);
    const raw = JSON.parse(JSON.stringify(options.arguments)) as Record<string, Json>;
    let expected: Json;
    try {
      expected = { called: true, arguments: options.inputSchema.parse(structuredClone(raw)) as Json };
    } catch (error) {
      if (!(error instanceof ZodError)) throw error;
      expected = { called: false };
    }
    const execute = async (args: any): Promise<Json> => {
      called = true;
      compareValues(args, args);
      captured = JSON.parse(JSON.stringify(args)) as Json;
      return options.stubResult ?? 'done';
    };
    const registered = options.makeTool
      ? options.makeTool(execute)
      : tool({ inputSchema: options.inputSchema, execute });
    const agent = new WorkflowAgent({
      model: fakeModel(options.toolName, JSON.stringify(raw)),
      tools: { [options.toolName]: registered },
    });
    await withTimeout(
      agent.stream({ prompt: 'probe', stopWhen: stepCountIs(2) }),
      options.timeoutMs ?? 5000,
    );
    const observed: Json = called
      ? { called: true, arguments: captured as Json }
      : { called: false };
    observations.push(makeObservation('input', expected, observed, options.allowances));
    return makeReport(options.caseId, 'ai-sdk-workflow-v2', dependencies, observations,
      undefined, undefined, raw);
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const outcome = message.includes('JSON comparison profile') ||
      message.includes('reserved missing marker') ? 'unsupported' : 'harness_error';
    return makeReport(options.caseId, 'ai-sdk-workflow-v2', dependencies, observations, outcome, message);
  }
}
