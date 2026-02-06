# Supabase Realtime Connection Issue

## What I'm Building
A collaborative text editor using:
- **Yjs** (CRDT library for conflict-free collaboration)
- **Supabase Realtime** (broadcast mode to sync Yjs updates between clients)
- **Lexical** (text editor framework)

## The Problem
Supabase Realtime channel subscribes but the subscription callback never fires with "SUBSCRIBED" status, causing the app to never detect that it's connected.

## Evidence

### Console Logs
```
🔧 Starting CRDT collaboration with Yjs...
📺 Creating Supabase Realtime channel: doc-collab
✅ Channel created: RealtimeChannel {state: 'joining', ...}
👤 User info: {userId: 'user-bd3m73igm', color: '#FFD93D', name: 'andy'}
🚀 Calling provider.connect()...
🔌 Connecting to Supabase channel...
🔍 Channel config: RealtimeChannel {state: 'joined', ...}
📦 Local persistence loaded
✅ Connection status: Live
⏸️  Skipping awareness update - not connected yet
```

### What Works ✅
- Supabase client initializes successfully
- Channel is created
- Channel state changes from `'joining'` → `'joined'`
- A separate component (ConnectionStatus) successfully subscribes to the same channel name and sees "SUBSCRIBED"

### What Doesn't Work ❌
- The `.subscribe((status) => {...})` callback in my SupabaseProvider **never fires**
- I never see the log: `📡 Channel subscription status: SUBSCRIBED`
- Therefore `this.connected` stays `false`
- My app can't send awareness updates

## My Code

### Channel Creation
```typescript
// In SupabaseProvider.ts constructor
this.channel = supabaseClient.channel(channelName, {
  config: {
    broadcast: {
      self: true,
      ack: false,
    },
  },
});
```

### Subscription Code (The Issue)
```typescript
// In SupabaseProvider.connect()
this.channel
  .on('broadcast', { event: 'yjs-update' }, this.handleRemoteUpdate)
  .on('broadcast', { event: 'yjs-awareness' }, this.handleRemoteAwareness)
  .on('broadcast', { event: 'sync-request' }, this.handleSyncRequest)
  .on('broadcast', { event: 'sync-response' }, this.handleSyncResponse)
  .subscribe((status) => {
    console.log('📡 Channel subscription status:', status);  // ← NEVER PRINTS

    if (status === 'SUBSCRIBED') {
      this.connected = true;
      console.log('✅ Yjs CRDT sync ready');
      // ... send initial messages
    }
  });
```

### Working Component (For Comparison)
```typescript
// This DOES work in ConnectionStatus.tsx
const channel = supabase.channel('doc-collab');
channel.subscribe((status) => {
  setIsConnected(status === 'SUBSCRIBED');  // ← This callback FIRES
  if (status === 'SUBSCRIBED') {
    console.log('✅ Connection status: Live');  // ← This PRINTS
  }
});
```

## My Configuration

**Supabase URL:** `https://juberlfvyedrbiixrkxt.supabase.co`

**Environment:**
- React 18 (with Strict Mode enabled - causes double mounting)
- @supabase/supabase-js installed
- Broadcast mode (not database replication)

## Questions for Supabase Assistant

1. **Why does the subscribe callback not fire** even though the channel state shows `'joined'`?

2. **Is there a difference** between how my SupabaseProvider subscribes vs the ConnectionStatus component?

3. **Does the order matter?** Should I call `.subscribe()` before or after `.on('broadcast', ...)`?

4. **React Strict Mode:** Could double-mounting be causing issues? I see the component mount, unmount, then mount again.

5. **Do I need to enable anything** in the Supabase dashboard for broadcast to work?

6. **Is there a better pattern** for using Supabase Realtime with Yjs CRDTs?

## What I've Tried
- ✅ Checking Supabase credentials (they work)
- ✅ Verifying the channel is created
- ✅ Confirming channel state shows 'joined'
- ✅ Adding explicit broadcast config
- ✅ Comparing with a working subscription (ConnectionStatus)
- ❌ Still can't get the subscription callback to fire

## Expected Behavior
The `.subscribe()` callback should be called with:
- `status = 'CHANNEL_ERROR'` on error
- `status = 'TIMED_OUT'` on timeout
- `status = 'SUBSCRIBED'` on success

But I'm getting **none of these**, even though the channel state is `'joined'`.

---

**Is this a known issue? Am I doing something wrong with the Supabase Realtime API?**
