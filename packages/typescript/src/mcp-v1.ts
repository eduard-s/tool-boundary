import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ZodError } from 'zod';
import { compareValues, makeObservation, makeReport, ProbeTimeoutError, withTimeout,
  type Allowance, type Json, type Observation, type ProbeReport } from './core.js';
import { JsonTransport } from './json-transport.js';

const require = createRequire(import.meta.url);

function packageVersion(entry: string, name: string): string {
  let directory = dirname(require.resolve(entry));
  while (true) {
    const manifest = resolve(directory, 'package.json');
    if (existsSync(manifest)) {
      const packageInfo = JSON.parse(readFileSync(manifest, 'utf8')) as {
        name?: string; version?: string;
      };
      if (packageInfo.name === name && packageInfo.version) return packageInfo.version;
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error(`Cannot find the ${name} package version`);
    directory = parent;
  }
}

export interface McpProbeOptions {
  caseId: string;
  toolName: string;
  arguments: Record<string, Json>;
  reference: (arguments_: Record<string, Json>) => Json;
  register: (server: McpServer, spy: (args: any) => Promise<any>) => void;
  stubHandler: (args: any) => Promise<any> | any;
  expectedStructured?: Json;
  expectedErrorText?: string;
  timeoutMs?: number;
  allowances?: Allowance[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function probeMcpTool(options: McpProbeOptions): Promise<ProbeReport> {
  const dependencies = {
    '@modelcontextprotocol/sdk': packageVersion(
      '@modelcontextprotocol/sdk/server/mcp.js', '@modelcontextprotocol/sdk',
    ),
    zod: require('zod/package.json').version as string,
  };
  const observations: Observation[] = [];
  let called = false;
  let captured: Json | undefined;
  let expectedInput: Json;
  try {
    compareValues(options.arguments, options.arguments);
    const raw = clone(options.arguments);
    try {
      expectedInput = { called: true, arguments: options.reference(clone(raw)) };
    } catch (error) {
      if (!(error instanceof ZodError)) throw error;
      expectedInput = { called: false };
    }

    const server = new McpServer({ name: 'tool-boundary-probe', version: '0.1.0' });
    const spy = async (args: any): Promise<any> => {
      called = true;
      compareValues(args, args);
      captured = clone(args);
      return await options.stubHandler(args);
    };
    options.register(server, spy);
    const client = new Client({ name: 'tool-boundary-probe', version: '0.1.0' });
    const [clientTransport, serverTransport] = JsonTransport.pair();
    let wireResponse: any;
    serverTransport.onSend = (message) => {
      const result = (message as { result?: unknown }).result;
      if (result && typeof result === 'object' && 'content' in result) {
        wireResponse = result;
      }
    };
    let response: any;
    let clientError: string | undefined;
    try {
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      const listing = await withTimeout(client.listTools(), options.timeoutMs ?? 5000);
      if (!listing.tools.some((item) => item.name === options.toolName)) {
        throw new Error(`The test tool ${options.toolName} was not registered`);
      }
      try {
        response = await withTimeout(
          client.callTool({ name: options.toolName, arguments: raw }),
          options.timeoutMs ?? 5000,
        );
      } catch (error) {
        if (error instanceof ProbeTimeoutError) throw error;
        clientError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      }
    } finally {
      await client.close();
      await server.close();
    }

    const observedInput: Json = called
      ? { called: true, arguments: captured as Json }
      : { called: false };
    observations.push(makeObservation('input', expectedInput, observedInput,
      options.allowances));
    if (Object.hasOwn(options, 'expectedStructured')) {
      const expected: Json = {
        structuredContent: options.expectedStructured as Json, clientAccepted: true,
      };
      const rawContent = wireResponse?.structuredContent ?? response?.structuredContent;
      const observed: Json = {
        ...(rawContent === undefined ? {} : { structuredContent: clone(rawContent) }),
        clientAccepted: clientError === undefined,
        ...(clientError ? { clientError } : {}),
      };
      observations.push(makeObservation('result', expected, observed, options.allowances));
    }
    if (options.expectedErrorText !== undefined) {
      const expected: Json = { isError: true, text: options.expectedErrorText };
      const observed: Json = clientError
        ? { clientError }
        : {
            isError: response?.isError === true,
            text: (response?.content ?? [])
              .filter((item: any) => item.type === 'text')
              .map((item: any) => item.text).join('\n'),
          };
      observations.push(makeObservation('error', expected, observed, options.allowances));
    }
    return makeReport(options.caseId, 'mcp-typescript-v1', dependencies, observations,
      undefined, undefined, raw);
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    const outcome = message.includes('JSON comparison profile') ||
      message.includes('reserved missing marker') ? 'unsupported' : 'harness_error';
    return makeReport(options.caseId, 'mcp-typescript-v1', dependencies, observations, outcome, message);
  }
}
