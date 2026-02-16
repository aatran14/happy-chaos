-- Complete Supabase Setup for Flashy (PATCHED for dev)
-- Run this entire file in Supabase SQL Editor
-- Fixes: BIGINT consistency, COALESCE for NULL handling, updated_at trigger

-- 1. Create documents table
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

-- 2. Create document_versions table for version history
CREATE TABLE IF NOT EXISTS public.document_versions (
  id BIGSERIAL PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version BIGINT NOT NULL,
  yjs_state TEXT NOT NULL,
  content_text TEXT, -- Plain text preview of version
  last_edited_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON public.documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON public.document_versions(document_id, created_at DESC);

-- 4. Enable RLS (you can disable this for testing)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (allow anonymous access for dev)
DROP POLICY IF EXISTS "Allow anonymous access to documents" ON public.documents;
CREATE POLICY "Allow anonymous access to documents"
  ON public.documents FOR ALL TO anon
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous access to versions" ON public.document_versions;
CREATE POLICY "Allow anonymous access to versions"
  ON public.document_versions FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- 6. CREATE RPC FUNCTION: get_document
CREATE OR REPLACE FUNCTION public.get_document(p_document_id TEXT)
RETURNS TABLE (
  id TEXT,
  title TEXT,
  owner_id TEXT,
  yjs_state TEXT,
  content_text TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_edited_by TEXT,
  version BIGINT,
  is_deleted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.owner_id,
    d.yjs_state,
    d.content_text,
    d.created_at,
    d.updated_at,
    d.last_edited_by,
    d.version,
    d.is_deleted
  FROM documents d
  WHERE d.id = p_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. CREATE RPC FUNCTION: upsert_document_rpc (FIXED: BIGINT + COALESCE)
CREATE OR REPLACE FUNCTION public.upsert_document_rpc(
  p_id TEXT,
  p_title TEXT,
  p_owner_id TEXT,
  p_yjs_state_base64 TEXT,
  p_content_text TEXT,
  p_last_edited_by TEXT,
  p_min_version BIGINT DEFAULT 0,  -- FIXED: was INTEGER
  p_snapshot_every_n INTEGER DEFAULT 10,
  p_snapshot_every_seconds INTEGER DEFAULT 300
)
RETURNS JSON AS $$
DECLARE
  v_current_version BIGINT;  -- FIXED: was INTEGER
  v_new_version BIGINT;      -- FIXED: was INTEGER
  v_last_snapshot_time TIMESTAMP;
  v_save_count INTEGER;
  v_should_snapshot BOOLEAN := FALSE;
  v_success BOOLEAN := FALSE;
BEGIN
  -- Get current version from database (FIXED: added COALESCE)
  SELECT COALESCE(version, 0) INTO v_current_version
  FROM documents
  WHERE id = p_id;

  -- If document doesn't exist, current version is 0
  IF v_current_version IS NULL THEN
    v_current_version := 0;
  END IF;

  -- Check for version conflict
  IF v_current_version > p_min_version THEN
    RETURN json_build_object(
      'success', FALSE,
      'server_version', v_current_version,
      'message', 'Conflict: server has newer version'
    );
  END IF;

  -- No conflict - proceed with update
  v_new_version := v_current_version + 1;

  -- Upsert the document
  INSERT INTO documents (id, title, owner_id, yjs_state, content_text, last_edited_by, version, updated_at)
  VALUES (p_id, p_title, p_owner_id, p_yjs_state_base64, p_content_text, p_last_edited_by, v_new_version, NOW())
  ON CONFLICT (id) DO UPDATE SET
    title = p_title,
    yjs_state = p_yjs_state_base64,
    content_text = p_content_text,
    last_edited_by = p_last_edited_by,
    version = v_new_version,
    updated_at = NOW();

  v_success := TRUE;

  -- Check if we should create a version snapshot
  SELECT MAX(created_at), COUNT(*)
  INTO v_last_snapshot_time, v_save_count
  FROM document_versions
  WHERE document_id = p_id;

  IF v_save_count IS NULL THEN
    v_save_count := 0;
  END IF;

  -- Create snapshot every Nth save
  IF (v_save_count + 1) % p_snapshot_every_n = 0 THEN
    v_should_snapshot := TRUE;
  END IF;

  -- Create snapshot every X seconds
  IF v_last_snapshot_time IS NULL OR
     EXTRACT(EPOCH FROM (NOW() - v_last_snapshot_time)) >= p_snapshot_every_seconds THEN
    v_should_snapshot := TRUE;
  END IF;

  -- Create snapshot if needed
  IF v_should_snapshot THEN
    INSERT INTO document_versions (document_id, version, yjs_state, content_text, last_edited_by, created_at)
    VALUES (p_id, v_new_version, p_yjs_state_base64, p_content_text, p_last_edited_by, NOW());

    RETURN json_build_object(
      'success', v_success,
      'server_version', v_new_version,
      'message', 'Document saved with snapshot created'
    );
  END IF;

  RETURN json_build_object(
    'success', v_success,
    'server_version', v_new_version,
    'message', 'Document saved successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CREATE RPC FUNCTION: get_document_versions
CREATE OR REPLACE FUNCTION public.get_document_versions(
  p_document_id TEXT,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  id BIGINT,
  document_id TEXT,
  version BIGINT,
  yjs_state TEXT,
  content_text TEXT,
  last_edited_by TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    document_id,
    version,
    yjs_state,
    content_text,
    last_edited_by,
    created_at
  FROM public.document_versions
  WHERE document_id = p_document_id
    AND (p_from IS NULL OR created_at >= p_from)
    AND (p_to IS NULL OR created_at <= p_to)
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- 9. BONUS: Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.documents;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- 10. Insert initial empty document
INSERT INTO public.documents (id, title, owner_id, yjs_state, content_text)
VALUES ('main-document', 'Flashy Knowledge Base', 'anonymous', NULL, '')
ON CONFLICT (id) DO NOTHING;

-- Done! Now test with: SELECT * FROM get_document('main-document');
