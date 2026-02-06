/**
 * Simple Supabase Provider for Yjs
 * Minimal implementation - no workarounds, just the basics
 */
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { SupabaseClient } from '@supabase/supabase-js';

export class SimpleSupabaseProvider {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  private supabase: SupabaseClient<any>;
  private channelName: string;
  private channel: any;
  connected: boolean = false;
  private broadcastingSetup: boolean = false;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor(doc: Y.Doc, supabase: SupabaseClient<any>, channelName: string) {
    this.doc = doc;
    this.supabase = supabase;
    this.channelName = channelName;
    this.awareness = new awarenessProtocol.Awareness(doc);

    console.log('📺 SimpleProvider: Creating channel:', channelName);
  }

  // Implement Provider interface methods for compatibility with createBinding
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(...args));
    }
  }

  connect(): void {
    // Don't reconnect if already connected
    if (this.connected && this.channel) {
      console.log('✅ SimpleProvider: Already connected, skipping');
      return;
    }

    console.log('🔌 SimpleProvider: Connecting...');

    // Cleanup old channel if exists
    if (this.channel) {
      console.log('🧹 Cleaning up old channel...');
      this.channel.unsubscribe();
      this.channel = null;
    }

    // Create fresh channel
    this.channel = this.supabase.channel(this.channelName, {
      config: {
        broadcast: {
          self: true, // Receive our own messages for debugging
          ack: false, // Don't wait for acknowledgments
        },
      },
    });

    // Listen for document updates from other clients
    this.channel.on('broadcast', { event: 'doc-update' }, ({ payload }: any) => {
      console.log('📥 SimpleProvider: Received doc update', payload.update.length, 'bytes');
      const update = new Uint8Array(payload.update);
      console.log('   Doc clientID:', this.doc.clientID);
      console.log('   Content BEFORE:', this.doc.getText('content').toString().substring(0, 50));
      Y.applyUpdate(this.doc, update, this);
      console.log('   Content AFTER:', this.doc.getText('content').toString().substring(0, 50));
      console.log('✅ Applied update to local doc');
    });

    // Listen for awareness updates (cursors, presence)
    this.channel.on('broadcast', { event: 'awareness' }, ({ payload }: any) => {
      console.log('📥 SimpleProvider: Received awareness update');
      const update = new Uint8Array(payload.update);
      awarenessProtocol.applyAwarenessUpdate(this.awareness, update, this);
    });

    // Subscribe to channel
    this.channel.subscribe((status: string) => {
      console.log('📡 SimpleProvider: Status:', status);

      if (status === 'SUBSCRIBED') {
        this.connected = true;
        console.log('✅ SimpleProvider: Connected!');

        // Emit status event for compatibility
        this.emit('status', { status: 'connected' });

        // Set up local update broadcasting
        this.setupLocalBroadcasting();
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ SimpleProvider: Channel error');
        this.connected = false;
        this.emit('status', { status: 'disconnected' });
      } else if (status === 'TIMED_OUT') {
        console.error('❌ SimpleProvider: Timeout');
        this.connected = false;
        this.emit('status', { status: 'disconnected' });
      }
    });
  }

  private setupLocalBroadcasting(): void {
    // Only set up once
    if (this.broadcastingSetup) {
      console.log('⏭️  Broadcasting already set up, skipping');
      return;
    }

    console.log('📡 Setting up local broadcasting...');
    this.broadcastingSetup = true;

    // Broadcast local document changes
    this.doc.on('update', (update: Uint8Array, origin: any) => {
      console.log('📝 SimpleProvider: Doc update detected!');
      console.log('   Origin:', origin?.constructor?.name || origin);
      console.log('   Origin === this?', origin === this);
      console.log('   Connected?', this.connected);
      console.log('   Update size:', update.length, 'bytes');

      // Don't broadcast updates that came from remote (would create loop)
      // But DO broadcast updates from local editing (CodeMirror/yCollab)
      if (origin === this) {
        console.log('⏸️  Skipping broadcast - origin is this provider (came from remote)');
        return;
      }

      if (!this.connected) {
        console.log('⏸️  Skipping broadcast - not connected');
        return;
      }

      console.log('📤 SimpleProvider: Broadcasting doc update:', update.length, 'bytes');
      const result = this.channel.send({
        type: 'broadcast',
        event: 'doc-update',
        payload: { update: Array.from(update) }
      });
      console.log('📤 Broadcast result:', result);
    });

    // Broadcast local awareness changes
    this.awareness.on('update', ({ added, updated, removed }: any) => {
      if (!this.connected) return;

      const changedClients = added.concat(updated).concat(removed);
      const update = awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients);

      console.log('📤 SimpleProvider: Broadcasting awareness');
      this.channel.send({
        type: 'broadcast',
        event: 'awareness',
        payload: { update: Array.from(update) }
      });
    });
  }

  disconnect(): void {
    console.log('🔌 SimpleProvider: Disconnecting...');
    if (this.channel) {
      this.channel.unsubscribe();
    }
    this.connected = false;
    this.emit('status', { status: 'disconnected' });
  }

  destroy(): void {
    console.log('🗑️  SimpleProvider: Destroying...');
    this.disconnect();
    this.awareness.destroy();
  }
}
