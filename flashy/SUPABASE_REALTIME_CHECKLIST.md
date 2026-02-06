# Supabase Realtime Broadcast Issue - Support Checklist

## Problem Statement
Realtime Broadcast messages are not being received. Messages are sent successfully but never received by any client (including the sender with `self: true`).

## Project Details
- **Project URL**: https://juberlfvyedrbiixrkxt.supabase.co
- **Issue**: Broadcast messages are sent but never received
- **Use Case**: Collaborative text editor with Yjs CRDT (similar to Google Docs)

## Current Behavior
```javascript
// Channel subscribes successfully
Status: SUBSCRIBED ✅

// Message is sent
channel.send({
  type: 'broadcast',
  event: 'test',
  payload: { message: 'Hello' }
}) ✅

// But NEVER received by any client ❌
channel.on('broadcast', { event: 'test' }, (payload) => {
  // This callback NEVER fires
})
```

## Required Configuration

### 1. Enable Realtime Broadcast
- [ ] Navigate to: **Settings** → **API** → **Realtime**
- [ ] Verify **Realtime** is enabled (toggle ON)
- [ ] Verify **Broadcast** feature is enabled
- [ ] Verify **Presence** feature is enabled (for awareness/cursors)

### 2. Channel Configuration
- [ ] Confirm channels can be created dynamically (no pre-authorization needed)
- [ ] Confirm `self: true` option works (clients receive their own broadcasts)
- [ ] Confirm no RLS (Row Level Security) blocking broadcast messages

### 3. Check Rate Limits
- [ ] Verify project is not hitting rate limits
- [ ] Check if `eventsPerSecond: 100` is allowed (currently configured)
- [ ] Verify no throttling or quota exceeded errors in logs

### 4. Network/CORS Configuration
- [ ] Verify WebSocket connections are allowed
- [ ] Check for any firewall/proxy blocking WebSocket upgrades
- [ ] Confirm CORS is configured correctly (should allow localhost:3000)

### 5. Authentication
- [ ] Verify anon key has permission to use Realtime Broadcast
- [ ] Check if RLS policies are blocking Realtime (should not affect broadcast)
- [ ] Confirm no auth requirements for broadcast channels

## Test Code
```typescript
const channel = supabase.channel('test-channel', {
  config: {
    broadcast: { self: true, ack: false }
  }
});

channel
  .on('broadcast', { event: 'test' }, (payload) => {
    console.log('✅ Received:', payload);
  })
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.send({
        type: 'broadcast',
        event: 'test',
        payload: { message: 'Hello' }
      });
    }
  });

// Expected: Console log shows "✅ Received: { message: 'Hello' }"
// Actual: Callback never fires ❌
```

## Expected Outcome
- Broadcast messages should be received by all subscribed clients
- With `self: true`, the sender should also receive their own messages
- Multiple browser windows on the same channel should see each other's messages

## Questions for Supabase Support
1. Is Realtime Broadcast enabled by default on free tier projects?
2. Are there any additional configuration steps needed in the dashboard?
3. Are there any known issues with Realtime Broadcast in this region?
4. Should we see any errors in the Supabase project logs?
5. Is there a difference between "Realtime" and "Realtime Broadcast" settings?

## What We Need Working
- ✅ Channel creation and subscription (currently works)
- ❌ Broadcast message delivery (currently broken)
- ❌ Multiple clients receiving the same broadcast (needed for collaboration)
- ❌ `self: true` receiving own messages (needed for testing)

## Additional Context
We're building a collaborative markdown editor using:
- **Yjs** (CRDT for conflict-free sync)
- **y-codemirror.next** (editor bindings)
- **Supabase Realtime Broadcast** (transport layer for Yjs updates)

Without working broadcasts, no collaboration features work (no sync, no cursors, no presence).
