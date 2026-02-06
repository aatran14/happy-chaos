import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey, $isTextNode } from 'lexical';
import './RemoteCursors.css';

interface CursorInfo {
  clientID: number;
  name: string;
  color: string;
  position: { top: number; left: number; height: number } | null;
  isLocal: boolean;
}

interface RemoteCursorsProps {
  awareness: any;
}

export function RemoteCursors({ awareness }: RemoteCursorsProps) {
  const [editor] = useLexicalComposerContext();
  const [cursors, setCursors] = useState<CursorInfo[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const updateCursors = () => {
      const states = awareness.getStates();
      const localClientID = awareness.doc.clientID;
      const newCursors: CursorInfo[] = [];

      console.log('🎯 RemoteCursors: Updating cursors, total states:', states.size, 'local client:', localClientID);

      states.forEach((state: any, clientID: number) => {
        console.log('  Client', clientID, ':', { user: state.user, hasSelection: !!state.selection });

        const isLocal = clientID === localClientID;
        const user = state.user;
        const selection = state.selection;

        if (user && selection) {
          console.log(`    ✅ Valid ${isLocal ? 'local' : 'remote'} user, calculating position...`);
          // Calculate cursor position from selection
          const position = getCursorPosition(editor, selection);
          console.log('    📍 Position:', position);

          newCursors.push({
            clientID,
            name: user.name || `User ${clientID}`,
            color: user.color || '#999',
            position,
            isLocal,
          });
        } else {
          console.log('    ⚠️  Missing user or selection');
        }
      });

      console.log('🎯 Final cursor count:', newCursors.length);
      setCursors(newCursors);
    };

    // Update when awareness changes or editor updates
    awareness.on('change', updateCursors);
    const removeUpdateListener = editor.registerUpdateListener(updateCursors);

    updateCursors();

    return () => {
      awareness.off('change', updateCursors);
      removeUpdateListener();
    };
  }, [awareness, editor]);

  return (
    <>
      {cursors.map((cursor) => (
        cursor.position && (
          <div
            key={cursor.clientID}
            className={`remote-cursor ${cursor.isLocal ? 'remote-cursor--local' : ''}`}
            style={{
              position: 'fixed',
              top: cursor.position.top,
              left: cursor.position.left,
              height: cursor.position.height,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            <div
              className="remote-cursor__caret"
              style={{
                backgroundColor: cursor.color,
                height: cursor.position.height,
              }}
            />
            <div
              className="remote-cursor__label"
              style={{ backgroundColor: cursor.color }}
            >
              {cursor.name}
            </div>
          </div>
        )
      ))}
    </>
  );
}

function getCursorPosition(
  editor: any,
  selection: { anchorKey: string; anchorOffset: number }
): { top: number; left: number; height: number } | null {
  try {
    return editor.getEditorState().read(() => {
      const { anchorKey, anchorOffset } = selection;

      // Get the node by key
      const node = $getNodeByKey(anchorKey);
      if (!node) return null;

      // Get the DOM element for this node
      const domNode = editor.getElementByKey(anchorKey);
      if (!domNode) return null;

      // For text nodes, calculate position based on offset
      if ($isTextNode(node)) {
        const range = document.createRange();
        const textNode = domNode.firstChild || domNode;

        try {
          range.setStart(textNode, Math.min(anchorOffset, textNode.textContent?.length || 0));
          range.setEnd(textNode, Math.min(anchorOffset, textNode.textContent?.length || 0));

          const rect = range.getBoundingClientRect();

          return {
            top: rect.top,
            left: rect.left,
            height: rect.height || 20,
          };
        } catch (e) {
          console.error('Error creating range:', e);
        }
      }

      // Fallback to element position
      const rect = domNode.getBoundingClientRect();

      return {
        top: rect.top,
        left: rect.left,
        height: rect.height || 20,
      };
    });
  } catch (e) {
    console.error('Error getting cursor position:', e);
    return null;
  }
}
