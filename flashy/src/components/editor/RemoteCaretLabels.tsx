import { useEffect, useState } from 'react';
import { EditorView } from 'codemirror';
import { collaborationManager } from '../../lib/CollaborationManager';

interface CaretLabel {
  clientId: number;
  name: string;
  color: string;
  position: { top: number; left: number } | null;
}

export function RemoteCaretLabels({ editorView }: { editorView: EditorView | null }) {
  const [labels, setLabels] = useState<CaretLabel[]>([]);

  useEffect(() => {
    if (!editorView) return;

    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const { provider, ydoc } = await collaborationManager.connect();
        const localClientId = ydoc.clientID;

        const updateLabels = () => {
          const states = provider.awareness.getStates();
          const labelList: CaretLabel[] = [];

          states.forEach((state: any, clientId: number) => {
            // Skip local user
            if (clientId === localClientId) return;

            // Check if user has a text caret position
            if (state.cursor && state.user?.name) {
              const anchor = state.cursor.anchor ?? state.cursor.head;

              if (anchor !== undefined) {
                try {
                  // Get the DOM coordinates for this text position
                  const pos = editorView.coordsAtPos(anchor);

                  if (pos) {
                    labelList.push({
                      clientId,
                      name: state.user.name,
                      color: state.user.color || '#667eea',
                      position: {
                        top: pos.top,
                        left: pos.left,
                      },
                    });
                  }
                } catch (error) {
                  // Position might be out of bounds
                  console.warn('Could not get caret position for', state.user.name);
                }
              }
            }
          });

          setLabels(labelList);
        };

        // Update labels when awareness changes
        provider.awareness.on('change', updateLabels);

        // Update labels when editor scrolls or updates
        const updateListener = () => {
          updateLabels();
        };
        editorView.dom.addEventListener('scroll', updateListener);

        // Initial update
        updateLabels();

        cleanup = () => {
          provider.awareness.off('change', updateLabels);
          editorView.dom.removeEventListener('scroll', updateListener);
          collaborationManager.disconnect();
        };
      } catch (error) {
        console.error('Failed to connect RemoteCaretLabels:', error);
      }
    })();

    return () => {
      if (cleanup) cleanup();
    };
  }, [editorView]);

  return (
    <>
      {labels.map((label) =>
        label.position ? (
          <div
            key={label.clientId}
            className="remote-caret-label"
            style={{
              position: 'absolute',
              top: label.position.top - 28,
              left: label.position.left,
              padding: '4px 10px',
              borderRadius: '5px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'white',
              backgroundColor: label.color,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              pointerEvents: 'none',
              zIndex: 1000,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          >
            {label.name}
          </div>
        ) : null
      )}
    </>
  );
}
