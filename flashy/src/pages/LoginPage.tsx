import { useState, FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import './AuthPages.css';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter your name');
      return;
    }

    const success = login(password, username.trim());

    if (!success) {
      setError('Incorrect password');
      setPassword('');
    }
    // No navigation - auth state change will trigger re-render
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Welcome to Flashy</h1>
        <p className="auth-subtitle">Enter the shared password to access your study group's notes</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Your Name</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter shared password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="auth-button">
            Enter
          </button>
        </form>

        <p className="auth-footer-note">
          💡 This is a shared workspace for your study group
        </p>
      </div>
    </div>
  );
}
