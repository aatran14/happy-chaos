// Simple test to verify Supabase Realtime is working
import { supabase } from './config/supabase';

export async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...');

  // Test 1: Check if supabase client exists
  console.log('✓ Supabase client created:', !!supabase);

  // Test 2: Create a test channel
  const testChannel = supabase.channel('test-channel-' + Math.random(), {
    config: {
      broadcast: { self: true },
    },
  });

  console.log('✓ Test channel created:', testChannel);

  // Test 3: Subscribe and wait for status
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('❌ Subscription timeout - channel never connected'));
    }, 5000);

    testChannel
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('✓ Received broadcast:', payload);
      })
      .subscribe((status, err) => {
        console.log('📡 Test channel status:', status, err);

        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          console.log('✅ SUCCESS! Supabase Realtime is working!');

          // Send a test message
          testChannel.send({
            type: 'broadcast',
            event: 'test',
            payload: { message: 'Hello from test!' }
          });

          setTimeout(() => {
            testChannel.unsubscribe();
            resolve(true);
          }, 1000);
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout);
          console.error('❌ FAILED! Channel error:', err);
          reject(err);
        }
      });
  });
}
