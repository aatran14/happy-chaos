# Verification Test Plan

## Goal
4 users can edit simultaneously, see each other's cursors, and data persists.

## Test Steps
1. **Single user persistence**
   - Open app, login, type "Hello"
   - Refresh page
   - ✅ Should still see "Hello"

2. **Two users real-time sync**
   - Tab 1: Login as Alice
   - Tab 2: Login as Bob
   - Alice types "Test"
   - ✅ Bob should see "Test" appear in real-time

3. **Colored cursors**
   - Alice types
   - ✅ Bob should see Alice's colored cursor with her name

4. **Data persistence across users**
   - Alice types "Persisted text"
   - Close both tabs
   - Reopen as Alice
   - ✅ Should see "Persisted text"

## Current Status
- ❌ Supabase channels stuck in "joining" state
- ❌ Subscribe callbacks never fire
- ❌ No real-time sync working

## Fix Strategy
1. Remove all workarounds
2. Use simplest possible Supabase Realtime pattern
3. Test broadcast works FIRST (without Yjs)
4. Then add Yjs integration
5. Verify each step
