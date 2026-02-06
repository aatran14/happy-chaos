import { useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { EditorPage } from './pages/EditorPage';
import { testBroadcast } from './lib/test-broadcast';

function AppContent() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Test if Supabase Realtime works at all
    testBroadcast();
  }, []);

  // Single page - just show login or editor
  return isAuthenticated ? <EditorPage /> : <LoginPage />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
