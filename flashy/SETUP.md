# Development Setup

## Environment Configuration

This project uses separate Supabase projects for development and production.

### 1. Create Two Supabase Projects

Go to https://app.supabase.com and create:
- **flashy-dev** - for development and testing
- **flashy-prod** - for production deployment

### 2. Copy Database Schema

In your production project, go to SQL Editor and export your schema.
Run the same SQL in your dev project to create identical tables.

### 3. Configure Environment Files

Create these two files (both are gitignored):

**`.env.development.local`** - Used by `npm start`
```bash
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_dev_anon_key
REACT_APP_SHARED_PASSWORD=flashy123
```

**`.env.production.local`** - Used by `npm run build` and deployments
```bash
REACT_APP_SUPABASE_URL=https://yyyyy.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_prod_anon_key
REACT_APP_SHARED_PASSWORD=flashy123
```

Get credentials from: **Project Settings → API** in each Supabase project

### 4. Workflow

```bash
# Development - uses dev Supabase
npm start

# Build for production - uses prod Supabase
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Benefits

✅ Test UI changes without affecting production users
✅ Full CRDT, real-time, and collaboration features work in dev
✅ Safe to break things in development
✅ Automatic environment switching
