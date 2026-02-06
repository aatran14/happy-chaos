import { useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';

export function MarkdownEditorSimple() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    console.log('🎨 Creating simple CodeMirror editor...');

    try {
      const state = EditorState.create({
        doc: '# Test\n\nType here...',
        extensions: [
          basicSetup,
          markdown(),
        ],
      });

      const view = new EditorView({
        state,
        parent: editorRef.current,
      });

      viewRef.current = view;
      console.log('✅ Editor created successfully!', view);
    } catch (error) {
      console.error('❌ Error creating editor:', error);
    }

    return () => {
      console.log('🧹 Destroying editor...');
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ height: '100%', border: '1px solid red' }}>
      <h3>Simple Editor Test</h3>
      <div ref={editorRef} style={{ height: '400px', border: '1px solid blue' }} />
    </div>
  );
}
