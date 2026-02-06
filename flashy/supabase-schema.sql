-- Create documents table for persistent storage
-- Run this in Supabase Dashboard → SQL Editor

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Untitled Document',
  owner_id TEXT NOT NULL DEFAULT 'anonymous',
  yjs_state TEXT, -- Base64-encoded Yjs document state
  content_text TEXT, -- Plain text for search/preview
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_edited_by TEXT,
  version BIGINT NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for now (you can add auth later)
CREATE POLICY "Allow anonymous access to documents"
  ON public.documents
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON public.documents(updated_at DESC);

-- Insert initial empty document
INSERT INTO public.documents (id, title, owner_id, yjs_state, content_text)
VALUES ('main-document', 'Flashy Knowledge Base', 'anonymous', NULL, '')
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.documents IS 'Stores Yjs document state for collaborative editing';
COMMENT ON COLUMN public.documents.yjs_state IS 'Base64-encoded Yjs state vector for CRDT sync';
COMMENT ON COLUMN public.documents.content_text IS 'Plain text version for search and preview';
