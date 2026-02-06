import { useAuth } from '../hooks/useAuth';
import { MarkdownEditor } from '../components/editor/MarkdownEditor';
import { VersionHistory } from '../components/editor/VersionHistory';
import { collaborationManager } from '../lib/CollaborationManager';
import './EditorPage.css';

export function EditorPage() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    // No navigation - auth state change will trigger re-render
  };

  const handleRestore = async (version: number) => {
    // Access the persistence layer from the collaboration manager
    const persistence = (collaborationManager as any).persistence;
    if (persistence) {
      await persistence.restoreVersion(version);
    } else {
      throw new Error('Persistence not initialized');
    }
  };

  return (
    <div className="editor-page">
      <div className="editor-header">
        <h1 className="editor-title">Flashy</h1>
        <div className="header-actions">
          <VersionHistory onRestore={handleRestore} />
          <button onClick={handleLogout} className="lock-button">
            🔒 Lock
          </button>
        </div>
      </div>

      <div className="editor-container">
        <div className="editor-content">
          <MarkdownEditor />
        </div>

        <div className="flashcard-sidebar">
          <h3>Flashcards</h3>
          <p className="sidebar-placeholder">
            Flashcards will appear here as you add markdown headers
          </p>
        </div>
      </div>
    </div>
  );
}
