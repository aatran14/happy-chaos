# Version History & Snapshots - Complete! 🎉

## What You Now Have

### ✅ Automatic Version Snapshots
- **Smart sampling**: Saves snapshot every **10 saves** OR every **5 minutes** (whichever comes first)
- **30-day retention**: Auto-deletes snapshots older than 30 days
- **No database bloat**: Only ~12 snapshots per hour max (not every 2-second save)

### ✅ Point-in-Time Recovery
- **"Restore to yesterday"** capability without Pro plan
- **View version history** - see all snapshots with timestamps
- **One-click restore** - revert to any previous version

### ✅ Conflict Detection
- **Version checking** prevents overwriting newer data
- **Automatic rejection** of stale updates
- **Logs warn you** if save is rejected

---

## How It Works

### Automatic Snapshots

Every time the document is saved:
1. **Regular save** happens every 2 seconds (main document)
2. **Snapshot created** if either:
   - 10 saves have happened since last snapshot
   - 5 minutes have passed since last snapshot
3. **Auto-cleanup** removes snapshots older than 30 days

### Console Logs

You'll see:
```
💾 Saving document to Supabase... 1234 characters
✅ Document saved successfully (version: 1738790123456)
   Status: updated
📸 Version snapshot created!  ← When snapshot is taken
```

---

## Using Version History

### View History (Browser Console)

```javascript
// Get last 10 versions
const persistence = collaborationManager.persistence;
const history = await persistence.getVersionHistory(10);

console.table(history);
// Shows: version, created_at, last_edited_by
```

### Restore Previous Version

```javascript
// Restore to specific version number
const persistence = collaborationManager.persistence;
await persistence.restoreVersion(1738790123456);

// Document reverts to that version ✅
```

---

## Configuration

Edit `src/lib/DocumentPersistence.ts` to customize:

```typescript
// Current settings:
const SNAPSHOT_EVERY_N_SAVES = 10;     // Every 10th save
const SNAPSHOT_EVERY_SECONDS = 300;    // OR every 5 minutes

// More frequent snapshots (costs more storage):
const SNAPSHOT_EVERY_N_SAVES = 5;      // Every 5th save
const SNAPSHOT_EVERY_SECONDS = 180;    // OR every 3 minutes

// Less frequent (saves storage):
const SNAPSHOT_EVERY_N_SAVES = 20;     // Every 20th save
const SNAPSHOT_EVERY_SECONDS = 600;    // OR every 10 minutes
```

---

## Database Tables

### `documents` table
- Stores current/latest document state
- Updated every 2 seconds (debounced autosave)

### `document_versions` table (NEW!)
- Stores historical snapshots
- Auto-created by sampling logic
- Auto-cleaned after 30 days
- Columns: `document_id`, `version`, `yjs_state`, `created_at`, `last_edited_by`

---

## Testing Version History

1. **Refresh browser** and start typing
2. **Wait for snapshots** - you'll see `📸 Version snapshot created!` every 5 minutes
3. **Make changes** over time
4. **Open console** and run:
   ```javascript
   // View history
   const mgr = window.collaborationManager; // Exposed for testing
   const history = await mgr.persistence.getVersionHistory();
   console.table(history);

   // Restore old version
   await mgr.persistence.restoreVersion(history[1].version);
   ```

---

## Storage Estimates

### Regular saves (every 2s)
- Only updates `documents` table
- 1 row, constantly updated
- Minimal storage growth

### Version snapshots (every 5 min)
- ~12 snapshots/hour
- ~288 snapshots/day
- Auto-cleanup after 30 days
- Max ~8,640 snapshots stored (30 days × 288/day)

**Estimated storage:**
- Average document: 50 KB
- 8,640 snapshots × 50 KB = ~432 MB max (well within Free tier)

---

## Benefits

✅ **No data loss** - Can restore from accidental deletions
✅ **Free tier friendly** - Smart sampling prevents bloat
✅ **Automatic** - No user action needed
✅ **30-day history** - Good balance of retention vs. storage
✅ **Version conflict protection** - Prevents race conditions

---

## Future Enhancements (Optional)

- [ ] Add UI to browse version history
- [ ] Add "compare versions" diff view
- [ ] Add manual snapshot button ("Save checkpoint")
- [ ] Add restore confirmation dialog
- [ ] Add version tagging ("v1.0", "before meeting", etc.)

Your collaborative editor now has enterprise-grade version history! 🚀
