import { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { EditorView as EditorViewType } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { yCollab } from 'y-codemirror.next';
import { UndoManager } from 'yjs';
import { collaborationManager } from '../../lib/CollaborationManager';
import './MarkdownEditor.css';

export function MarkdownEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    console.log('🎨 MarkdownEditor: Initializing...');
    console.log('⏸️  Editor disabled until database syncs (Rule 2)');

    // Get Yjs doc and provider from singleton
    const { ydoc, provider } = collaborationManager.connect();
    const ytext = ydoc.getText('content');

    console.log('📊 Provider status:', {
      connected: provider.connected,
      clientID: ydoc.clientID,
      awarenessStates: provider.awareness.getStates().size,
    });

    // Wait for database to load before enabling editor (Rule 2)
    const waitForSync = async () => {
      console.log('⏳ Waiting for database to sync...');
      // Actually wait for database to finish loading
      await collaborationManager.waitForDatabaseSync();

      // CRITICAL: Wait 1 more second for real-time updates to arrive
      // The database might have old data, but real-time will send the latest
      console.log('⏳ Waiting for real-time updates...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsReady(true);
      console.log('✅ Database synced - Editor ready!');
    };

    waitForSync();

    // Create undo manager for collaborative undo/redo
    const undoManager = new UndoManager(ytext);

    console.log('📄 Initial Yjs content length:', ytext.length);

    // Create CodeMirror editor with Yjs collaboration
    const state = EditorState.create({
      doc: ytext.toString(), // Set initial content from Yjs
      extensions: [
        basicSetup,
        markdown(),
        yCollab(ytext, provider.awareness, {
          undoManager,
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    console.log('📊 CodeMirror initialized with', view.state.doc.length, 'characters');

    // Disable editing until ready (Rule 2)
    if (!isReady) {
      view.contentDOM.setAttribute('contenteditable', 'false');
      view.contentDOM.style.opacity = '0.5';
      view.contentDOM.style.cursor = 'wait';
    }

    // Add listeners to debug sync
    ytext.observe((event, transaction) => {
      const ytextContent = ytext.toString();
      const editorContent = view.state.doc.toString();

      console.log('📝 Yjs text changed:', {
        local: transaction.local,
        ytextLength: ytext.length,
        editorLength: view.state.doc.length,
        ytextPreview: ytextContent.substring(0, 50) + '...',
        editorPreview: editorContent.substring(0, 50) + '...',
        inSync: ytextContent === editorContent,
      });

      if (ytextContent !== editorContent) {
        console.warn('⚠️  MISMATCH: Yjs and CodeMirror out of sync!');
        console.log('  Yjs has:', ytextContent.length, 'chars');
        console.log('  Editor has:', editorContent.length, 'chars');
      }
    });

    provider.awareness.on('change', () => {
      const states = provider.awareness.getStates();
      console.log('👥 Awareness changed:', {
        totalUsers: states.size,
        localClientID: ydoc.clientID,
      });
      states.forEach((state, clientID) => {
        console.log(`  User ${clientID}:`, state.user);
      });
    });

    console.log('✅ MarkdownEditor: Ready with collaborative cursors!');

    return () => {
      setIsReady(false);
      console.log('🧹 MarkdownEditor: Cleaning up...');
      view.destroy();
      collaborationManager.disconnect();
      viewRef.current = null;
    };
  }, []);

  // Enable editor when ready (Rule 2)
  useEffect(() => {
    if (isReady && viewRef.current) {
      viewRef.current.contentDOM.setAttribute('contenteditable', 'true');
      viewRef.current.contentDOM.style.opacity = '1';
      viewRef.current.contentDOM.style.cursor = 'text';
      console.log('⌨️  Editor enabled - ready for input');
    }
  }, [isReady]);

  return (
    <div className="markdown-editor-wrapper">
      <div ref={editorRef} className="markdown-editor" />
    </div>
  );
}
