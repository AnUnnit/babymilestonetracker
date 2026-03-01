# Baby Tracker — Deploy Guide
## From zero to live app in ~20 minutes. No coding needed.

---

## What you'll get
- A live URL like `https://your-baby-tracker.vercel.app`
- Email login / signup for any family member
- All data saved securely per account in Supabase
- Works on iPhone and Android — add to Home Screen for an app icon
- Share read-only links with grandparents/doctors (no account needed to view)

---

## Step 1 — Create your Supabase project (5 min)

1. Go to **https://supabase.com** and click **Start your project**
2. Sign up with GitHub or email (free)
3. Click **New project**
   - Name: `baby-tracker`
   - Database password: choose anything strong
   - Region: pick the closest to you (e.g. South Asia for India)
4. Wait ~2 minutes for the project to spin up
5. Go to **SQL Editor** (left sidebar) → **New query**
6. Open the file `supabase_schema.sql` from this folder
7. Paste the entire contents into the editor and click **Run**
   - You should see "Success. No rows returned"
8. Go to **Settings → API** (left sidebar)
9. Copy two values — you'll need them in Step 3:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

---

## Step 2 — Upload the code to GitHub (5 min)

1. Go to **https://github.com** and sign up / log in
2. Click **+** → **New repository**
   - Name: `baby-tracker`
   - Keep it **Private**
   - Click **Create repository**
3. On your computer, open a terminal (Mac: Terminal app, Windows: Command Prompt)
4. Navigate to the `baby-tracker` folder you downloaded from Claude
5. Run these commands one by one:

```bash
git init
git add .
git commit -m "Initial baby tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/baby-tracker.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your GitHub username shown on github.com

---

## Step 3 — Deploy to Vercel (5 min)

1. Go to **https://vercel.com** and sign up with your GitHub account
2. Click **Add New → Project**
3. Find `baby-tracker` in the list and click **Import**
4. Under **Environment Variables**, add these two (from Step 1 Step 9):

   | Name | Value |
   |------|-------|
   | `REACT_APP_SUPABASE_URL` | `https://abcdefgh.supabase.co` |
   | `REACT_APP_SUPABASE_ANON_KEY` | `eyJ...your long key...` |

5. Click **Deploy** — wait ~2 minutes
6. Vercel gives you a URL like `https://baby-tracker-xyz.vercel.app`

**Your app is live!** 🎉

---

## Step 4 — Add to phone Home Screen

### iPhone (Safari)
1. Open your Vercel URL in Safari
2. Tap the **Share** button (box with arrow pointing up)
3. Scroll down → tap **Add to Home Screen**
4. Name it "Baby Tracker" → tap **Add**

### Android (Chrome)
1. Open your Vercel URL in Chrome
2. Tap the **⋮** menu → **Add to Home screen**
3. Tap **Add**

---

## Step 5 — Enable email confirmation (recommended)

By default Supabase allows login without email confirmation. To require it:

1. Supabase dashboard → **Authentication → Providers**
2. Under **Email**, enable **Confirm email**
3. New signups will get a confirmation email before they can log in

---

## Sharing with family

1. Open the app → go to **Profile tab**
2. Under **Share with family**, type a label (e.g. "Grandma") and click **Create link**
3. Copy the link and send via WhatsApp / email
4. The recipient opens the link — no account needed, read-only view

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Missing Supabase environment variables" | Check Vercel → Settings → Environment Variables are set correctly |
| Login not working | Check Supabase → Auth → Users to see if the account exists |
| Data not saving | Open browser console (F12) — check for error messages |
| App looks broken | Try clearing cache / hard refresh (Ctrl+Shift+R) |

---

## Keeping it updated

Whenever you want to update the app, just edit files and run:
```bash
git add .
git commit -m "Update"
git push
```
Vercel auto-deploys within 60 seconds.

---

## Costs

| Service | Free tier | Limit |
|---------|-----------|-------|
| Supabase | Free forever | 500MB DB, 50,000 active users/month |
| Vercel | Free forever | 100GB bandwidth/month |

For a family tracker these limits will never be hit.
