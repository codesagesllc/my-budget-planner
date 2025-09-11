# Supabase API Key Troubleshooting

## The Error
You're getting "Invalid API key" when trying to insert data into Supabase, even though you have the keys in your `.env.local` file.

## Common Causes & Solutions

### 1. Check Your Current `.env.local` File

Make sure your `.env.local` has these exact keys (no typos, no extra spaces):

```env
NEXT_PUBLIC_SUPABASE_URL=https://ftnihylyezhlzzvolltr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### 2. Get Fresh Keys from Supabase

The keys in your `.env.example` might be outdated. Here's how to get new ones:

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project** (ftnihylyezhlzzvolltr)
3. **Go to Settings** (gear icon) → **API**
4. **Copy the correct keys**:
   - **Project URL**: Should be `https://ftnihylyezhlzzvolltr.supabase.co`
   - **anon public**: This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role**: This is your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### 3. Common Mistakes to Check

1. **Using the wrong key format**:
   - ❌ Wrong: `NEXT_PUBLIC_SUPABASE_ANON_KEY="your_key"` (with quotes)
   - ✅ Right: `NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key` (no quotes)

2. **Key expiration**:
   - The key in your `.env.example` expires in 2070 (check the `exp` field in the JWT)
   - But if the project was paused or deleted, the key won't work

3. **Trailing spaces or line breaks**:
   - Make sure there are no spaces after the key
   - Make sure each key is on its own line

### 4. Verify Your Keys Work

Create a test file `test-supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ftnihylyezhlzzvolltr.supabase.co'
const supabaseKey = 'YOUR_ANON_KEY_HERE' // paste your actual key

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  const { data, error } = await supabase
    .from('users')
    .select('count')
    .limit(1)
  
  if (error) {
    console.error('Connection failed:', error)
  } else {
    console.log('Connection successful!')
  }
}

testConnection()
```

Run: `node test-supabase.js`

### 5. Restart Your Dev Server

After updating `.env.local`:
1. Stop your dev server (Ctrl+C)
2. Run `npm run dev` again
3. Environment variables are only loaded on startup

### 6. Check Supabase Project Status

1. Go to https://supabase.com/dashboard
2. Check if your project is:
   - **Active** (good!)
   - **Paused** (needs to be resumed)
   - **Deleted** (you'll need a new project)

### 7. RLS (Row Level Security) Issues

If the connection works but inserts fail:
1. Go to Supabase Dashboard → Table Editor
2. Select your `bills` table
3. Check if RLS is enabled
4. If yes, you might need to:
   - Add a policy for inserts
   - OR temporarily disable RLS for testing

### 8. Use Service Role Key for Inserts (If Needed)

If you're doing server-side inserts, you might need the service role key:

```javascript
// For server-side operations that bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service key for admin operations
)
```

## Quick Checklist

- [ ] Copied fresh keys from Supabase Dashboard
- [ ] Updated `.env.local` with new keys (no quotes, no spaces)
- [ ] Restarted dev server
- [ ] Verified project is active in Supabase
- [ ] Checked RLS policies on the `bills` table
- [ ] Tested connection with a simple query

## Still Not Working?

1. **Check browser console** for detailed error messages
2. **Check Supabase logs**: Dashboard → Logs → API logs
3. **Verify the table exists**: Dashboard → Table Editor → Check for `bills` table

The most likely issue is either:
- The keys in `.env.local` don't match what's in Supabase
- The dev server needs to be restarted
- RLS is blocking the insert
