import { useEffect, useState, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { collaborationManager } from '../../lib/CollaborationManager';
import { RemoteCursors } from './RemoteCursors';
import SelectionSyncPlugin from './SelectionSyncPlugin';
import { $getRoot, $createParagraphNode, $createTextNode, TextNode, $isParagraphNode } from 'lexical';
import { SimpleSupabaseProvider } from '../../lib/SimpleSupabaseProvider';
import * as Y from 'yjs';

export default function CollaborationPlugin() {
  const [editor] = useLexicalComposerContext();
  const [provider, setProvider] = useState<SimpleSupabaseProvider | null>(null);
  const syncing = useRef(false);

  useEffect(() => {
    console.log('🔧 CollaborationPlugin: Starting...');

    let cleanup: (() => void) | null = null;
    let removeUpdateListener: (() => void) | null = null;

    (async () => {
      try {
        // Get singleton instance
        const { ydoc, provider: sharedProvider } = await collaborationManager.connect();
        setProvider(sharedProvider);

        const ytext = ydoc.getText('content');

        // Sync Yjs → Lexical (when remote changes come in)
        const handleYjsChange = (event: Y.YTextEvent, transaction: Y.Transaction) => {
          // Only sync if this change came from a remote source (not from this client)
          if (transaction.origin !== 'local') {
            syncing.current = true;
            const newText = ytext.toString();

            editor.update(() => {
              const root = $getRoot();
              const currentText = root.getTextContent();

              // Only update if text actually changed
              if (currentText !== newText) {
                console.log('📥 Remote change:', newText.substring(0, 30));

                // Get first paragraph
                const firstChild = root.getFirstChild();

                if (firstChild && $isParagraphNode(firstChild)) {
                  // Try to update existing text node
                  const textNode = firstChild.getFirstChild();
                  if (textNode && textNode.getType() === 'text') {
                    (textNode as TextNode).setTextContent(newText);
                    return;
                  }
                }

                // Otherwise rebuild (first time or structure changed)
                root.clear();
                const paragraph = $createParagraphNode();
                paragraph.append($createTextNode(newText));
                root.append(paragraph);
              }
            }, { tag: 'collaboration' });

            syncing.current = false;
          }
        };

        // Sync Lexical → Yjs (when user types)
        removeUpdateListener = editor.registerUpdateListener(({ editorState, tags }) => {
          // Skip if this update came from Yjs
          if (tags.has('collaboration') || syncing.current) {
            return;
          }

          editorState.read(() => {
            const root = $getRoot();
            const newText = root.getTextContent();

            const currentYText = ytext.toString();
            if (newText !== currentYText) {
              console.log('📝 Local change, updating Yjs:', newText.substring(0, 50));

              // Update Yjs with 'local' origin to prevent it from syncing back to this client
              ydoc.transact(() => {
                ytext.delete(0, ytext.length);
                ytext.insert(0, newText);
              }, 'local');
            }
          });
        });

        // Set up the Yjs observer
        ytext.observe(handleYjsChange);

        // Initial sync from Yjs to Lexical
        const initialText = ytext.toString();
        if (initialText) {
          console.log('🔄 Initial sync from Yjs:', initialText.substring(0, 50));
          syncing.current = true;
          editor.update(() => {
            const root = $getRoot();
            root.clear();
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(initialText));
            root.append(paragraph);
          }, { tag: 'collaboration' });
          syncing.current = false;
        }

        cleanup = () => {
          console.log('🧹 CollaborationPlugin: Cleaning up...');
          ytext.unobserve(handleYjsChange);
          if (removeUpdateListener) removeUpdateListener();
          collaborationManager.disconnect();
          setProvider(null);
        };
      } catch (error) {
        console.error('Failed to connect CollaborationPlugin:', error);
      }
    })();

    return () => {
      if (cleanup) cleanup();
    };
  }, [editor]);

  return (
    <>
      <SelectionSyncPlugin provider={provider} />
      <RemoteCursors awareness={provider?.awareness} />
    </>
  );
}
