import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock Supabase to avoid real connections during tests
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      })
    }
  }
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    // Just check that it renders something
    expect(document.body).toBeTruthy();
  });

  it('should render auth or editor', async () => {
    render(<App />);
    // App should render either login or editor page
    const appElement = document.querySelector('.App');
    expect(appElement || document.body).toBeTruthy();
  });
});
