import { useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';
import './ConnectionStatus.css';

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Monitor the same channel used for collaboration
    // This shows real-time CRDT sync status
    const channel = supabase.channel('doc-collab');

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED') {
        console.log('✅ Connection status: Live');
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
      <span className="status-dot"></span>
      <span className="status-text">
        {isConnected ? 'Live' : 'Connecting...'}
      </span>
    </div>
  );
}
