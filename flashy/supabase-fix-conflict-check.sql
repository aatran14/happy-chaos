-- Fix: Remove conflict checking for CRDT mode
-- CRDTs merge automatically, so version conflicts don't apply

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
RETURNS JSON AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
  v_last_snapshot_time TIMESTAMP;
  v_save_count INTEGER;
  v_should_snapshot BOOLEAN := FALSE;
  v_success BOOLEAN := FALSE;
BEGIN
  -- Get current version from database
  SELECT version INTO v_current_version
  FROM documents
  WHERE id = p_id;

  -- If document doesn't exist, current version is 0
  IF v_current_version IS NULL THEN
    v_current_version := 0;
  END IF;

  -- REMOVED: Version conflict check (CRDTs don't need this)
  -- CRDTs merge automatically via Yjs, database is just dumb storage

  -- Increment version
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
    INSERT INTO document_versions (document_id, version, yjs_state, last_edited_by, created_at)
    VALUES (p_id, v_new_version, p_yjs_state_base64, p_last_edited_by, NOW());

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
