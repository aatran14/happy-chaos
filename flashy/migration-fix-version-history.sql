-- ============================================================================
-- Migration: Fix document_versions table to enable useful version history
-- ============================================================================
-- This migration:
-- 1. Adds content_text column for version previews
-- 2. Updates upsert_document_rpc to save content_text in snapshots
-- 3. Updates get_document_versions to return only useful columns
-- 4. Drops unused columns (server_version, yjs_state_base64, saved_by)
--
-- Safe to run multiple times (idempotent)
-- ============================================================================

-- STEP 1: Add content_text column if it doesn't exist
ALTER TABLE public.document_versions
  ADD COLUMN IF NOT EXISTS content_text TEXT;

-- STEP 2: Update upsert_document_rpc to save content_text in snapshots
CREATE OR REPLACE FUNCTION public.upsert_document_rpc(
  p_id TEXT,
  p_title TEXT,
  p_owner_id TEXT,
  p_yjs_state_base64 TEXT,
  p_content_text TEXT,
  p_last_edited_by TEXT,
  p_min_version INTEGER DEFAULT 0,
  p_snapshot_every_n INTEGER DEFAULT 10,
  p_snapshot_every_seconds INTEGER DEFAULT 300
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_last_snapshot_time TIMESTAMP;
  v_save_count INTEGER;
  v_should_snapshot BOOLEAN := FALSE;
  v_success BOOLEAN := FALSE;
BEGIN
  -- Get current version from documents
  SELECT version INTO v_current_version
  FROM documents
  WHERE id = p_id;

  IF v_current_version IS NULL THEN
    v_current_version := 0;
  END IF;

  -- Increment version
  v_new_version := v_current_version + 1;

  -- Upsert the document (store the provided base64 yjs state into documents.yjs_state)
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

  -- Determine snapshot metadata
  SELECT MAX(created_at), COUNT(*)
  INTO v_last_snapshot_time, v_save_count
  FROM document_versions
  WHERE document_id = p_id;

  IF v_save_count IS NULL THEN
    v_save_count := 0;
  END IF;

  IF (v_save_count + 1) % p_snapshot_every_n = 0 THEN
    v_should_snapshot := TRUE;
  END IF;

  IF v_last_snapshot_time IS NULL OR
     EXTRACT(EPOCH FROM (NOW() - v_last_snapshot_time)) >= p_snapshot_every_seconds THEN
    v_should_snapshot := TRUE;
  END IF;

  -- Create snapshot if needed (NOW INCLUDES content_text!)
  IF v_should_snapshot THEN
    INSERT INTO document_versions (
      document_id,
      version,
      yjs_state,
      content_text,
      last_edited_by,
      created_at
    )
    VALUES (
      p_id,
      v_new_version,
      p_yjs_state_base64,
      p_content_text,
      p_last_edited_by,
      NOW()
    );

    RETURN json_build_object(
      'success', TRUE,
      'server_version', v_new_version,
      'message', 'Document saved with snapshot created'
    );
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'server_version', v_new_version,
    'message', 'Document saved successfully'
  );
END;
$$;

-- STEP 3: Update get_document_versions to return only useful columns
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

-- STEP 4: Verify unused columns exist (informational only)
DO $$
DECLARE
  v_columns TEXT;
BEGIN
  SELECT string_agg(column_name, ', ')
  INTO v_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'document_versions'
    AND column_name IN ('server_version', 'yjs_state_base64', 'saved_by');

  IF v_columns IS NOT NULL THEN
    RAISE NOTICE 'Found unused columns to drop: %', v_columns;
  ELSE
    RAISE NOTICE 'No unused columns found (already dropped or never existed)';
  END IF;
END $$;

-- STEP 5: Drop unused columns
ALTER TABLE public.document_versions
  DROP COLUMN IF EXISTS server_version,
  DROP COLUMN IF EXISTS yjs_state_base64,
  DROP COLUMN IF EXISTS saved_by;

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- New snapshots will now include content_text for easy preview
-- Old snapshots will have NULL content_text (which is fine)
-- ============================================================================
