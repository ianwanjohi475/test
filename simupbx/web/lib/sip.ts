'use client';

// Real WebRTC softphone engine. When NEXT_PUBLIC_SIP_WSS + credentials are
// configured (fetched from the API after login, or via env for kiosk mode),
// this registers against FreeSWITCH over secure WebSocket and places/receives
// real calls. Without config it reports 'demo' so the UI stays usable.

import {
  Inviter,
  Invitation,
  Registerer,
  RegistererState,
  SessionState,
  UserAgent,
  type Session,
} from 'sip.js';

export type PhoneStatus = 'demo' | 'connecting' | 'registered' | 'unregistered' | 'error';
export type CallPhase = 'idle' | 'dialing' | 'ringing-in' | 'active' | 'held' | 'ended';

export interface SipConfig {
  wssUrl: string;      // wss://pbx.example.com:7443
  domain: string;      // sip domain / realm
  extension: string;   // e.g. 100
  password: string;
  displayName?: string;
}

export interface PhoneEvents {
  onStatus?: (s: PhoneStatus) => void;
  onPhase?: (p: CallPhase, remote?: string) => void;
  onIncoming?: (from: string) => void;
}

export class Softphone {
  private ua?: UserAgent;
  private registerer?: Registerer;
  private session?: Session;
  private events: PhoneEvents;
  private remoteAudio?: HTMLAudioElement;

  status: PhoneStatus = 'demo';
  phase: CallPhase = 'idle';

  constructor(events: PhoneEvents = {}) {
    this.events = events;
  }

  async connect(cfg: SipConfig): Promise<void> {
    this.setStatus('connecting');
    const uri = UserAgent.makeURI(`sip:${cfg.extension}@${cfg.domain}`);
    if (!uri) throw new Error(`Invalid SIP URI for extension ${cfg.extension}`);

    this.ua = new UserAgent({
      uri,
      displayName: cfg.displayName ?? cfg.extension,
      authorizationUsername: cfg.extension,
      authorizationPassword: cfg.password,
      transportOptions: { server: cfg.wssUrl },
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        },
      },
      delegate: {
        onInvite: (invitation: Invitation) => this.handleIncoming(invitation),
      },
    });

    await this.ua.start();
    this.registerer = new Registerer(this.ua);
    this.registerer.stateChange.addListener((state) => {
      if (state === RegistererState.Registered) this.setStatus('registered');
      else if (state === RegistererState.Unregistered) this.setStatus('unregistered');
    });
    await this.registerer.register();
  }

  async call(target: string, domain: string): Promise<void> {
    if (!this.ua || this.status !== 'registered') {
      // Demo mode: simulate the call lifecycle so the UI is fully explorable.
      this.setPhase('dialing', target);
      setTimeout(() => this.phase === 'dialing' && this.setPhase('active', target), 1800);
      return;
    }
    const uri = UserAgent.makeURI(`sip:${target}@${domain}`);
    if (!uri) throw new Error(`Invalid target ${target}`);
    const inviter = new Inviter(this.ua, uri, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false },
      },
    });
    this.bindSession(inviter, target);
    this.setPhase('dialing', target);
    await inviter.invite();
  }

  async answer(): Promise<void> {
    if (this.session instanceof Invitation) {
      await this.session.accept({
        sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } },
      });
    } else {
      this.setPhase('active');
    }
  }

  async hangup(): Promise<void> {
    const s = this.session;
    if (s) {
      if (s.state === SessionState.Established) await s.bye();
      else if (s instanceof Inviter) await s.cancel();
      else if (s instanceof Invitation) await s.reject();
    }
    this.session = undefined;
    this.setPhase('ended');
    setTimeout(() => this.setPhase('idle'), 900);
  }

  async hold(on: boolean): Promise<void> {
    const s = this.session;
    if (s?.state === SessionState.Established) {
      await s.invite({ sessionDescriptionHandlerModifiers: on ? [holdModifier] : [] });
    }
    this.setPhase(on ? 'held' : 'active');
  }

  mute(on: boolean): void {
    const pc = this.peerConnection();
    pc?.getSenders().forEach((sn) => {
      if (sn.track?.kind === 'audio') sn.track.enabled = !on;
    });
  }

  sendDtmf(digit: string): void {
    this.session?.sessionDescriptionHandler?.sendDtmf(digit);
  }

  /** Blind transfer the active call to another extension/number. */
  async transfer(target: string, domain: string): Promise<void> {
    const uri = UserAgent.makeURI(`sip:${target}@${domain}`);
    if (this.session && uri) await this.session.refer(uri);
    this.setPhase('ended');
    setTimeout(() => this.setPhase('idle'), 900);
  }

  async disconnect(): Promise<void> {
    await this.registerer?.unregister().catch(() => undefined);
    await this.ua?.stop().catch(() => undefined);
    this.setStatus('demo');
  }

  private handleIncoming(invitation: Invitation) {
    this.bindSession(invitation, invitation.remoteIdentity.uri.user ?? 'unknown');
    const from =
      invitation.remoteIdentity.displayName || invitation.remoteIdentity.uri.user || 'Unknown';
    this.setPhase('ringing-in', from);
    this.events.onIncoming?.(from);
  }

  private bindSession(session: Session, remote: string) {
    this.session = session;
    session.stateChange.addListener((state) => {
      if (state === SessionState.Established) {
        this.attachAudio();
        this.setPhase('active', remote);
      } else if (state === SessionState.Terminated) {
        this.session = undefined;
        this.setPhase('ended', remote);
        setTimeout(() => this.setPhase('idle'), 900);
      }
    });
  }

  private attachAudio() {
    const pc = this.peerConnection();
    if (!pc) return;
    const stream = new MediaStream();
    pc.getReceivers().forEach((r) => r.track && stream.addTrack(r.track));
    if (!this.remoteAudio) {
      this.remoteAudio = new Audio();
      this.remoteAudio.autoplay = true;
    }
    this.remoteAudio.srcObject = stream;
  }

  private peerConnection(): RTCPeerConnection | undefined {
    const sdh = this.session?.sessionDescriptionHandler as
      | { peerConnection?: RTCPeerConnection }
      | undefined;
    return sdh?.peerConnection;
  }

  private setStatus(s: PhoneStatus) {
    this.status = s;
    this.events.onStatus?.(s);
  }
  private setPhase(p: CallPhase, remote?: string) {
    this.phase = p;
    this.events.onPhase?.(p, remote);
  }
}

function holdModifier(description: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
  if (description.sdp) {
    description.sdp = description.sdp
      .replace(/a=sendrecv\r\n/g, 'a=sendonly\r\n')
      .replace(/a=recvonly\r\n/g, 'a=inactive\r\n');
  }
  return Promise.resolve(description);
}
