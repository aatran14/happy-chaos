import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { SupabaseProvider } from '../../lib/SupabaseProvider';

interface CollaborationCursorsPluginProps {
  provider: SupabaseProvider | null;
}

export default function CollaborationCursorsPlugin({
  provider
}: CollaborationCursorsPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!provider) return;

    // Listen to awareness changes
    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const localClientID = provider.doc.clientID;

      console.log('👥 Awareness states:', states.size, 'users');

      // Log remote users for debugging
      states.forEach((state, clientID) => {
        if (clientID !== localClientID) {
          console.log('  Remote user:', state.user);
        }
      });
    };

    provider.awareness.on('change', handleAwarenessChange);

    return () => {
      provider.awareness.off('change', handleAwarenessChange);
    };
  }, [editor, provider]);

  return null;
}
