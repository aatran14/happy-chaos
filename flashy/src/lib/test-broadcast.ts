// Minimal test: Can Supabase Realtime broadcast work at all?
import { supabase } from '../config/supabase';

export function testBroadcast() {
  console.log('🧪 BROADCAST TEST: Starting...');

  const channelName = 'test-' + Date.now();
  const channel = supabase.channel(channelName);

  let messageReceived = false;

  channel
    .on('broadcast', { event: 'test' }, (payload: any) => {
      console.log('✅ BROADCAST TEST: Message received!', payload);
      messageReceived = true;
    })
    .subscribe((status: string) => {
      console.log('🧪 BROADCAST TEST: Status =', status);

      if (status === 'SUBSCRIBED') {
        console.log('✅ BROADCAST TEST: Channel subscribed successfully!');

        // Send a test message
        console.log('📤 BROADCAST TEST: Sending message...');
        channel.send({
          type: 'broadcast',
          event: 'test',
          payload: { message: 'Hello from test!', timestamp: Date.now() }
        });

        // Check if we received it
        setTimeout(() => {
          if (messageReceived) {
            console.log('✅✅✅ BROADCAST TEST: PASSED! Supabase Realtime works!');
          } else {
            console.log('❌ BROADCAST TEST: FAILED - Message not received');
          }
          channel.unsubscribe();
        }, 2000);
      } else if (status === 'CHANNEL_ERROR') {
        console.log('❌ BROADCAST TEST: FAILED - Channel error');
      } else if (status === 'TIMED_OUT') {
        console.log('❌ BROADCAST TEST: FAILED - Timeout');
      }
    });
}
