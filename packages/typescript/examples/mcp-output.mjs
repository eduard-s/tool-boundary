import { z } from 'zod';
import { probeMcpTool } from '@esmirnov.ai/tool-boundary/mcp-v1';

const input = z.object({ name: z.string() });
const output = z.object({ name: z.string(), counted: z.number().default(0) });

const report = await probeMcpTool({
  caseId: 'node.mcp-output-default',
  toolName: 'echo',
  arguments: { name: 'x' },
  reference: (raw) => input.parse(raw),
  register: (server, spy) => {
    server.registerTool('echo', { inputSchema: input, outputSchema: output }, spy);
  },
  stubHandler: async ({ name }) => ({
    content: [{ type: 'text', text: name }],
    structuredContent: { name },
  }),
  expectedStructured: { name: 'x', counted: 0 },
});

console.log(JSON.stringify(report, null, 2));
