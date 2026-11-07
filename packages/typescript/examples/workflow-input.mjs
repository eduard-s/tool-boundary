import { z } from 'zod';
import { probeWorkflowTool } from '@esmirnov.ai/tool-boundary/workflow';

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

console.log(JSON.stringify(report, null, 2));
