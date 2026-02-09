import { useEffect, useState } from 'react';
import { collaborationManager } from '../../lib/CollaborationManager';
import { getCursorDataUrl, getCursorSvg } from '../../config/cursorSvg';
import './MouseCursors.css';

interface CursorData {
  x: number;
  y: number;
  name: string;
  color: string;
  clientId: number;
}

export function MouseCursors() {
  const [cursors, setCursors] = useState<CursorData[]>([]);
  const [localColor, setLocalColor] = useState('#6BCF7F');

  useEffect(() => {
    const { provider, ydoc } = collaborationManager.connect();
    const localClientId = ydoc.clientID;

    // Get local user's color for CSS cursor
    const localUser = provider.awareness.getLocalState()?.user;
    const color = localUser?.color || '#6BCF7F';
    setLocalColor(color);

    // Get cursor URL from centralized config
    const cursorUrl = getCursorDataUrl(color);

    // Inject CSS with !important to override CodeMirror
    const style = document.createElement('style');
    style.textContent = `
      body, body * {
        cursor: url("${cursorUrl}") 0 0, auto !important;
      }
    `;
    document.head.appendChild(style);

    // Throttle mouse updates to reduce lag (update max every 50ms)
    let lastUpdate = 0;
    const THROTTLE_MS = 50;

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return;

      lastUpdate = now;
      provider.awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY,
      });
    };

    // Clear cursor when mouse leaves window
    const handleMouseLeave = () => {
      provider.awareness.setLocalStateField('cursor', null);
    };

    // Update cursor list from awareness
    const updateCursors = () => {
      const states = provider.awareness.getStates();
      const cursorList: CursorData[] = [];

      states.forEach((state: any, clientId: number) => {
        // Skip local cursor - we'll use CSS cursor instead (no lag!)
        if (clientId === localClientId) return;

        if (state.cursor && state.user?.name) {
          cursorList.push({
            x: state.cursor.x,
            y: state.cursor.y,
            name: state.user.name,
            color: state.user.color || '#999',
            clientId,
          });
        }
      });

      setCursors(cursorList);
    };

    // Set up listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    provider.awareness.on('change', updateCursors);

    // Initial update
    updateCursors();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      provider.awareness.off('change', updateCursors);
      collaborationManager.disconnect();
    };
  }, []);

  return (
    <>
      {cursors.map((cursor) => (
        <div
          key={cursor.clientId}
          className="remote-cursor"
          style={{
            left: cursor.x,
            top: cursor.y,
          }}
        >
          <div
            style={{ filter: `drop-shadow(0 2px 4px rgba(0,0,0,0.3))` }}
            dangerouslySetInnerHTML={{ __html: getCursorSvg(cursor.color) }}
          />
          <div
            className="cursor-label"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </div>
        </div>
      ))}
    </>
  );
}
