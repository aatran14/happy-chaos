# Supabase Dashboard Checks - What to Look For

## 1. Settings → API → Realtime

Go to: https://supabase.com/dashboard/project/juberlfvyedrbiixrkxt/settings/api

Look for the **Realtime** section:

### Check These Settings:
- [ ] **Realtime** toggle - Must be **ON** ✅
- [ ] **Broadcast** - Must be **ENABLED** ✅
- [ ] **Presence** - Should be **ENABLED** (for cursors)
- [ ] **Max events per second** - Should be at least **100**
- [ ] **Max payload size** - Should be at least **1MB** (default is fine)

**Take a screenshot or copy the exact values you see.**

---

## 2. Database → Policies (RLS Check)

Go to: https://supabase.com/dashboard/project/juberlfvyedrbiixrkxt/database/policies

### Check for policies on `realtime.messages` table:

1. Click on schema dropdown → Select **"realtime"** schema
2. Look for table **"messages"**
3. Check if ANY policies exist

**If policies exist:**
- Copy the policy SQL (click on the policy to see it)
- Paste it in response to Supabase bot

**If no policies exist:**
- Respond: "No RLS policies found on realtime.messages"

### What we need:
For public broadcast to work, anonymous users need SELECT permission on `realtime.messages`. If there are strict policies, they might block broadcasts.

---

## 3. Logs → Realtime Logs

Go to: https://supabase.com/dashboard/project/juberlfvyedrbiixrkxt/logs/realtime

### Look for errors in the last hour:
- [ ] Any "authorization" errors?
- [ ] Any "too_many_events" or rate limit errors?
- [ ] Any "broadcast" related errors?
- [ ] Any failed "phx_join" or "phx_reply" messages?

**Copy any error messages you find** (even if you don't understand them).

---

## 4. Settings → General → Project Settings

Go to: https://supabase.com/dashboard/project/juberlfvyedrbiixrkxt/settings/general

### Check:
- [ ] **Project Plan** - Is it Free tier or Pro?
- [ ] **Project Status** - Is it active/healthy?
- [ ] Any warnings about quotas or limits exceeded?

---

## Quick Response Template

Copy this and fill in the blanks:

```
Dashboard Check Results:

1. REALTIME SETTINGS (Settings → API → Realtime):
   - Realtime toggle: [ON/OFF]
   - Broadcast feature: [ENABLED/DISABLED]
   - Presence feature: [ENABLED/DISABLED]
   - Max events/sec: [NUMBER]
   - Max payload size: [SIZE]

2. RLS POLICIES (Database → Policies → realtime.messages):
   - Policies found: [YES/NO]
   - If yes, policy SQL: [PASTE HERE]

3. REALTIME LOGS (Logs → Realtime, last 1 hour):
   - Errors found: [YES/NO]
   - If yes, error messages: [PASTE HERE]

4. PROJECT STATUS:
   - Plan: [Free/Pro]
   - Status: [Active/Other]
   - Any warnings: [YES/NO - describe if yes]
```

---

## Most Likely Issues (Based on Symptoms)

Your symptoms (subscribe succeeds, messages not received) suggest ONE of these:

1. **Broadcast feature is disabled** in Settings → API → Realtime
   - FIX: Enable it in dashboard

2. **RLS policy is blocking anonymous clients** on realtime.messages
   - FIX: Remove strict policies or add policy to allow anon SELECT

3. **Messages are being sent as private** while clients joined as public
   - FIX: Ensure both sides match (currently using public)

4. **WebSocket transport issue** (rare, but possible)
   - FIX: Test from different network/browser

The bot needs your dashboard findings + console logs to pinpoint which one!
