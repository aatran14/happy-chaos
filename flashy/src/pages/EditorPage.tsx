import { useAuth } from '../hooks/useAuth';
import { MarkdownEditor } from '../components/editor/MarkdownEditor';
import { VersionHistory } from '../components/editor/VersionHistory';
import { OnlineUsers } from '../components/editor/OnlineUsers';
import { MouseCursors } from '../components/editor/MouseCursors';
import { Logo } from '../components/Logo';
import { StudyMode } from '../components/StudyMode';
import { collaborationManager } from '../lib/CollaborationManager';
import { useEffect, useState } from 'react';
import './EditorPage.css';

interface Flashcard {
  id: string;
  term: string;
  definition: string;
  lineNumber: number;
  section?: string;
}

export function EditorPage() {
  const { logout } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showStudyMode, setShowStudyMode] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const [clickedCardId, setClickedCardId] = useState<string | null>(null);

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

  // Parse flashcards from markdown content
  const parseFlashcards = (content: string): Flashcard[] => {
    const lines = content.split('\n');
    const cards: Flashcard[] = [];
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match H1 headers: # Section
      const h1Match = line.match(/^#\s+(.+)$/);
      if (h1Match) {
        currentSection = h1Match[1].trim();
        continue;
      }

      // Match H2 headers: ## Term
      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        const term = h2Match[1].trim();

        // Collect all content until next header (H1 or H2)
        let definition = '';
        let j = i + 1;
        while (j < lines.length && !lines[j].match(/^#{1,2}\s+/)) {
          definition += lines[j] + '\n';
          j++;
        }

        cards.push({
          id: `card-${i}`,
          term,
          definition: definition.trim(),
          lineNumber: i,
          section: currentSection || undefined,
        });
      }
    }

    return cards;
  };

  // Handle flashcard click - scroll to that line in editor
  const handleFlashcardClick = (cardId: string, lineNumber: number) => {
    // Trigger click animation
    setClickedCardId(cardId);
    setTimeout(() => setClickedCardId(null), 400);

    // Dispatch custom event that MarkdownEditor will listen for
    window.dispatchEvent(new CustomEvent('scrollToLine', {
      detail: { lineNumber }
    }));
  };

  // Handle resizing
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 250 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  // Add scroll listener for navbar effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Subscribe to document changes
  useEffect(() => {
    const { ydoc } = collaborationManager.connect();
    const ytext = ydoc.getText('content');

    // Initial parse
    const initialCards = parseFlashcards(ytext.toString());
    setFlashcards(initialCards);

    // Listen for changes
    const observer = () => {
      const content = ytext.toString();
      const cards = parseFlashcards(content);
      setFlashcards(cards);
    };

    ytext.observe(observer);

    return () => {
      ytext.unobserve(observer);
    };
  }, []);

  return (
    <div className="editor-page">
      <MouseCursors />
      <div className={`editor-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="editor-title-container">
          <Logo size={40} />
          <h1 className="editor-title">Flashy</h1>
        </div>
        <div className="header-actions">
          <OnlineUsers />
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

        <div className="resize-handle" onMouseDown={handleMouseDown}>
          <div className="resize-stick" />
        </div>

        <div
          className="flashcard-sidebar"
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="flashcard-header">
            <h3>Flashcards</h3>
            {flashcards.length > 0 && (
              <button
                className="study-mode-button"
                onClick={() => setShowStudyMode(true)}
                title="Expand flashcards"
              >
                ⤢
              </button>
            )}
          </div>
          {flashcards.length === 0 ? (
            <p className="sidebar-placeholder">
              Add H2 headers (## Term) to create flashcards
            </p>
          ) : (
            <div className="flashcard-list">
              {(() => {
                let lastSection = '';
                return flashcards.map((card) => {
                  const showSection = card.section && card.section !== lastSection;
                  lastSection = card.section || '';
                  return (
                    <div key={card.id}>
                      {showSection && (
                        <div className="flashcard-section">{card.section}</div>
                      )}
                      <div
                        className={`flashcard ${clickedCardId === card.id ? 'clicked' : ''}`}
                        onClick={() => handleFlashcardClick(card.id, card.lineNumber)}
                      >
                        <div className="flashcard-term">{card.term}</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      {showStudyMode && flashcards.length > 0 && (
        <StudyMode
          flashcards={flashcards}
          onClose={() => setShowStudyMode(false)}
        />
      )}
    </div>
  );
}
