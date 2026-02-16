import { supabase } from '../config/supabase';

describe('Supabase Configuration', () => {
  it('should have supabase client configured', () => {
    expect(supabase).toBeDefined();
  });

  it('should have correct environment variables', () => {
    expect(process.env.REACT_APP_SUPABASE_URL).toBeDefined();
    expect(process.env.REACT_APP_SUPABASE_ANON_KEY).toBeDefined();
  });
});

describe('Supabase RPC Functions', () => {
  it('should be able to call get_document RPC', async () => {
    const { data, error } = await supabase.rpc('get_document', {
      p_document_id: 'test-document'
    });

    // Should not throw error about function not existing
    if (error) {
      expect(error.code).not.toBe('PGRST202');
    }
  });
});
