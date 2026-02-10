/**
 * Supabase Realtime Debug Test
 * Run this in browser console to diagnose broadcast issues
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export function runSupabaseDebugTest() {
  console.log('🔍 SUPABASE DEBUG TEST: Starting with logger enabled...');
  console.log('');

  // Create client WITH realtime logger
  const supabaseDebug = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      logger: (kind: string, msg: string, data?: any) => {
        console.log(`[REALTIME ${kind}]`, msg, data);
      },
      params: {
        eventsPerSecond: 100,
      },
    },
  });

  const channelName = 'debug-test-' + Date.now();
  console.log('📺 Creating channel:', channelName);

  const channel = supabaseDebug.channel(channelName, {
    config: {
      broadcast: {
        self: true,  // Should receive own messages
        ack: true,   // Get server acknowledgments
      },
    },
  });

  // Listen with WILDCARD to catch all events
  channel.on('broadcast', { event: '' }, (payload) => {
    console.log('');
    console.log('✅✅✅ BROADCAST RECEIVED:', payload);
    console.log('');
  });

  channel.subscribe((status, err) => {
    console.log('');
    console.log('📡 Subscribe status:', status, err);
    console.log('');

    if (status === 'SUBSCRIBED') {
      console.log('✅ Channel subscribed! Now sending test message...');
      console.log('');

      // Send test broadcast
      channel.send({
        type: 'broadcast',
        event: 'test',
        payload: {
          message: 'Hello from debug test!',
          timestamp: Date.now(),
        },
      })
        .then((resp) => {
          console.log('');
          console.log('📤 Send response:', resp);
          console.log('');
        })
        .catch((err) => {
          console.error('');
          console.error('❌ Send error:', err);
          console.error('');
        });

      // Check after 3 seconds
      setTimeout(() => {
        console.log('');
        console.log('⏰ 3 seconds elapsed - check logs above');
        console.log('Look for: [REALTIME] push/receive messages');
        console.log('Expected: receive: realtime:' + channelName + ' broadcast');
        console.log('');
        channel.unsubscribe();
      }, 3000);
    } else if (status === 'CHANNEL_ERROR') {
      console.error('❌ Channel error:', err);
    } else if (status === 'TIMED_OUT') {
      console.error('❌ Channel timeout');
    }
  });

  console.log('');
  console.log('⏳ Waiting for logs... Watch for [REALTIME] messages below');
  console.log('');
}
