import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

/** A local MCP transport that serializes every message as JSON. */
export class JsonTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: <T extends JSONRPCMessage>(message: T) => void;
  onSend?: (message: JSONRPCMessage) => void;
  private peer?: JsonTransport;
  private started = false;

  static pair(): [JsonTransport, JsonTransport] {
    const left = new JsonTransport();
    const right = new JsonTransport();
    left.peer = right;
    right.peer = left;
    return [left, right];
  }

  async start(): Promise<void> {
    this.started = true;
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.started || !this.peer?.started) throw new Error('Transport is closed');
    const copy = JSON.parse(JSON.stringify(message)) as JSONRPCMessage;
    this.onSend?.(copy);
    queueMicrotask(() => this.peer?.onmessage?.(copy));
  }

  async close(): Promise<void> {
    this.started = false;
    this.onclose?.();
  }
}
