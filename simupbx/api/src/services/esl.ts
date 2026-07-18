// Minimal FreeSWITCH Event Socket Layer (ESL) client — no native deps.
// Connects to FS's inbound socket (default :8021), authenticates, subscribes
// to call events, and exposes api/bgapi commands (originate, transfer, etc.).

import net from 'node:net';
import { EventEmitter } from 'node:events';
import { config } from '../config.js';

interface EslMessage {
  headers: Record<string, string>;
  body: string;
}

export class EslClient extends EventEmitter {
  private socket?: net.Socket;
  private buffer = Buffer.alloc(0);
  private pending: ((msg: EslMessage) => void)[] = [];
  connected = false;

  connect(): void {
    this.socket = net.createConnection(config.esl.port, config.esl.host);
    this.socket.on('data', (chunk) => this.onData(chunk));
    this.socket.on('error', (err) => this.emit('error', err));
    this.socket.on('close', () => {
      this.connected = false;
      this.emit('disconnected');
      // FreeSWITCH may restart; keep trying so calls resume without a deploy.
      setTimeout(() => this.connect(), 5000);
    });
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const headerEnd = this.buffer.indexOf('\n\n');
      if (headerEnd === -1) return;
      const headerText = this.buffer.subarray(0, headerEnd).toString();
      const headers: Record<string, string> = {};
      for (const line of headerText.split('\n')) {
        const i = line.indexOf(':');
        if (i > 0) headers[line.slice(0, i).trim()] = decodeURIComponent(line.slice(i + 1).trim());
      }
      const bodyLen = Number(headers['Content-Length'] ?? 0);
      const total = headerEnd + 2 + bodyLen;
      if (this.buffer.length < total) return;
      const body = this.buffer.subarray(headerEnd + 2, total).toString();
      this.buffer = this.buffer.subarray(total);
      this.dispatch({ headers, body });
    }
  }

  private dispatch(msg: EslMessage): void {
    const type = msg.headers['Content-Type'];
    if (type === 'auth/request') {
      this.socket?.write(`auth ${config.esl.password}\n\n`);
    } else if (type === 'command/reply' && msg.headers['Reply-Text']?.includes('+OK accepted')) {
      this.connected = true;
      this.emit('connected');
      this.socket?.write('event json CHANNEL_CREATE CHANNEL_ANSWER CHANNEL_HANGUP_COMPLETE RECORD_STOP CUSTOM sofia::register sofia::unregister\n\n');
    } else if (type === 'text/event-json') {
      try {
        const ev = JSON.parse(msg.body);
        this.emit('event', ev);
        this.emit(ev['Event-Name'], ev);
      } catch {
        /* malformed event — ignore */
      }
    } else if (type === 'command/reply' || type === 'api/response') {
      this.pending.shift()?.(msg);
    }
  }

  /** Run a blocking api command, e.g. `sofia status`, `originate ...` */
  api(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.socket) return reject(new Error('ESL not connected'));
      this.pending.push((msg) => resolve(msg.body || msg.headers['Reply-Text'] || ''));
      this.socket.write(`api ${command}\n\n`);
    });
  }

  /** Click-to-call: ring the agent's extension first, then bridge to the target. */
  originate(fromExt: string, to: string, callerId: string): Promise<string> {
    const dest = to.startsWith('+') ? `sofia/gateway/trunk/${to}` : `user/${to}`;
    return this.api(
      `originate {origination_caller_id_number=${callerId},origination_caller_id_name='SimuPBX'}user/${fromExt} &bridge(${dest})`,
    );
  }

  transfer(uuid: string, target: string): Promise<string> {
    return this.api(`uuid_transfer ${uuid} ${target} XML default`);
  }

  hangup(uuid: string): Promise<string> {
    return this.api(`uuid_kill ${uuid}`);
  }

  startRecording(uuid: string, path: string): Promise<string> {
    return this.api(`uuid_record ${uuid} start ${path}`);
  }
}

export const esl = new EslClient();
