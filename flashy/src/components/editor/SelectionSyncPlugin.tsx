import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import { SupabaseProvider } from '../../lib/SupabaseProvider';

interface SelectionSyncPluginProps {
  provider: any;
}

export default function SelectionSyncPlugin({ provider }: SelectionSyncPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!provider) return;

    const updateSelection = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection)) {
          const anchor = selection.anchor;
          const focus = selection.focus;

          // Update awareness with selection
          provider.awareness.setLocalStateField('selection', {
            anchorKey: anchor.key,
            anchorOffset: anchor.offset,
            focusKey: focus.key,
            focusOffset: focus.offset,
          });
        } else {
          // Clear selection if no range selection
          provider.awareness.setLocalStateField('selection', null);
        }
      });
    };

    // Update selection on every editor change
    const removeUpdateListener = editor.registerUpdateListener(() => {
      updateSelection();
    });

    // Initial update
    updateSelection();

    return () => {
      removeUpdateListener();
    };
  }, [editor, provider]);

  return null;
}
