import { expect, it } from 'vitest';
import { tool } from 'ai';
import { z } from 'zod';
import { probeWorkflowTool } from '../src/workflow.js';

it('finds the WorkflowAgent regression in 2.0.68 and passes fixed versions', async () => {
  const report = await probeWorkflowTool({
    caseId: 'node.workflow-default-transform',
    toolName: 'search',
    arguments: { q: 'shoes', tag: 'sale' },
    inputSchema: z.object({
      q: z.string(),
      limit: z.number().default(10),
      tag: z.string().transform((value) => value.toUpperCase()),
    }),
  });
  const version = report.dependencyVersions['@ai-sdk/workflow'];
  expect(report.outcome, report.message).toBe(version === '2.0.68' ? 'fail' : 'pass');
  if (version === '2.0.68') {
    expect(report.observations[0].differences.map((item) => item.path))
      .toEqual(['/arguments/limit', '/arguments/tag']);
  }
});

it('finds a bypassed refinement', async () => {
  const report = await probeWorkflowTool({
    caseId: 'node.workflow-refinement',
    toolName: 'read',
    arguments: { path: 'etc/hosts' },
    inputSchema: z.object({
      path: z.string().refine((value) => value.startsWith('/')),
    }),
  });
  const version = report.dependencyVersions['@ai-sdk/workflow'];
  expect(report.outcome, report.message).toBe(version === '2.0.68' ? 'fail' : 'pass');
  if (version === '2.0.68') {
    expect(report.observations[0].differences.map((item) => item.path)).toContain('/called');
  }
});

it('passes ordinary input', async () => {
  const report = await probeWorkflowTool({
    caseId: 'node.workflow-control',
    toolName: 'echo',
    arguments: { text: 'hello' },
    inputSchema: z.object({ text: z.string() }),
  });
  expect(report.outcome, report.message).toBe('pass');
});

it('marks a non-JSON input unsupported before model dispatch', async () => {
  const report = await probeWorkflowTool({
    caseId: 'node.workflow-non-json',
    toolName: 'echo',
    arguments: { count: Number.NaN },
    inputSchema: z.object({ count: z.number() }),
  });
  expect(report.outcome).toBe('unsupported');
});

it('uses the caller tool factory', async () => {
  const schema = z.object({ text: z.string() });
  let factoryCalls = 0;
  const report = await probeWorkflowTool({
    caseId: 'node.workflow-tool-factory',
    toolName: 'echo',
    arguments: { text: 'hello' },
    inputSchema: schema,
    makeTool: (execute) => {
      factoryCalls++;
      return tool({ inputSchema: schema, execute });
    },
  });
  expect(factoryCalls).toBe(1);
  expect(report.outcome, report.message).toBe('pass');
});
