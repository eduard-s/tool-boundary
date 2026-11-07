import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Ajv } from 'ajv';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { probeMcpTool } from '../src/mcp-v1.js';

describe('MCP TypeScript v1', () => {
  it('passes an unchanged structured result', async () => {
    const input = z.object({ name: z.string() });
    const output = z.object({ name: z.string() });
    const report = await probeMcpTool({
      caseId: 'node.mcp-control', toolName: 'echo', arguments: { name: 'x' },
      reference: (raw) => input.parse(raw),
      register: (server, spy) => {
        server.registerTool('echo', { inputSchema: input, outputSchema: output }, spy);
      },
      stubHandler: async ({ name }) => ({
        content: [{ type: 'text', text: name }], structuredContent: { name },
      }),
      expectedStructured: { name: 'x' },
    });
    expect(report.outcome, report.message).toBe('pass');
    expect(report.dependencyVersions['@modelcontextprotocol/sdk']).toMatch(/^1\./);
    const schema = JSON.parse(readFileSync(
      fileURLToPath(new URL('../../../spec/report-v1.schema.json', import.meta.url)), 'utf8',
    ));
    expect(new Ajv().validate(schema, report)).toBe(true);
  });

  it('finds the output default lost by the SDK', async () => {
    const input = z.object({ name: z.string() });
    const output = z.object({ name: z.string(), counted: z.number().default(0) });
    const report = await probeMcpTool({
      caseId: 'node.mcp-output-default', toolName: 'echo', arguments: { name: 'x' },
      reference: (raw) => input.parse(raw),
      register: (server, spy) => {
        server.registerTool('echo', { inputSchema: input, outputSchema: output }, spy);
      },
      stubHandler: async ({ name }) => ({
        content: [{ type: 'text', text: name }], structuredContent: { name },
      }),
      expectedStructured: { name: 'x', counted: 0 },
    });
    expect(report.outcome, report.message).toBe('fail');
    expect(report.observations.at(-1)?.differences.map((item) => item.path))
      .toContain('/structuredContent/counted');
  });

  it('finds an undeclared output field retained by the SDK', async () => {
    const input = z.object({ name: z.string() });
    const output = z.object({ name: z.string() });
    const report = await probeMcpTool({
      caseId: 'node.mcp-output-extra', toolName: 'echo', arguments: { name: 'x' },
      reference: (raw) => input.parse(raw),
      register: (server, spy) => {
        server.registerTool('echo', { inputSchema: input, outputSchema: output }, spy);
      },
      stubHandler: async ({ name }) => ({
        content: [{ type: 'text', text: name }], structuredContent: { name, sneaky: true },
      }),
      expectedStructured: { name: 'x' },
    });
    expect(report.outcome, report.message).toBe('fail');
    expect(report.observations.at(-1)?.differences.map((item) => item.path))
      .toContain('/structuredContent/sneaky');
  });

  it('passes an explicit tool error', async () => {
    const input = z.object({});
    const output = z.object({ count: z.number() });
    const report = await probeMcpTool({
      caseId: 'node.mcp-error-control', toolName: 'count', arguments: {},
      reference: (raw) => input.parse(raw),
      register: (server, spy) => {
        server.registerTool('count', { inputSchema: input, outputSchema: output }, spy);
      },
      stubHandler: async () => ({
        isError: true, content: [{ type: 'text', text: 'Not found' }],
      }),
      expectedErrorText: 'Not found',
    });
    expect(report.outcome, report.message).toBe('pass');
  });

  it('classifies a wrong tool name as a harness error', async () => {
    const input = z.object({ name: z.string() });
    const report = await probeMcpTool({
      caseId: 'node.mcp-wrong-name', toolName: 'missing', arguments: { name: 'x' },
      reference: (raw) => input.parse(raw),
      register: (server, spy) => {
        server.registerTool('echo', { inputSchema: input }, spy);
      },
      stubHandler: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    });
    expect(report.outcome).toBe('harness_error');
    expect(report.message).toContain('not registered');
  });
});
