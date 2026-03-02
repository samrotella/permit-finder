# Quick Start Guide - PermitFinder

## 🚀 Get Running in 5 Minutes

### Step 1: Install Dependencies (2 minutes)

```bash
# Frontend
npm install

# Backend
cd server && npm install && cd ..
```

### Step 2: Set Up Supabase (2 minutes)

1. Go to https://supabase.com and create a free account
2. Create a new project (wait ~2 minutes for setup)
3. Go to SQL Editor and run this:

```sql
CREATE TABLE user_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  city TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE permit_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  project_type TEXT NOT NULL,
  permit_info JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(city, state, project_type)
);

ALTER TABLE user_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for user_emails" ON user_emails FOR ALL USING (true);
CREATE POLICY "Enable all for permit_data" ON permit_data FOR ALL USING (true);
```

4. Copy your project URL and anon key from Settings > API

### Step 3: Configure Environment (30 seconds)

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...your-key-here
PORT=3001
```

### Step 4: Run the App (30 seconds)

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
cd server && npm run dev
```

### Step 5: Test It Out! 🎉

1. Open http://localhost:3000
2. Try searching for: "Austin, TX" + "Residential - New Construction"
3. See the magic happen!

## 🎨 What You Built

### Frontend Features
- Beautiful dark-themed UI with orange/yellow accents
- Smooth animations and transitions
- Responsive design (works on mobile)
- Optional email capture (doesn't block users)
- Real-time form validation

### Backend Features
- Smart caching system (24-hour cache)
- Multi-tier data fetching:
  1. Check Supabase cache first
  2. Try to scrape official government sites
  3. Fall back to comprehensive general data
- Email storage for follow-up
- RESTful API

### Database (Supabase)
- PostgreSQL with automatic scaling
- Row-level security enabled
- Indexed for fast lookups
- Free tier: 500MB database, perfect for starting

## 📊 How the Data Flow Works

```
User fills form
    ↓
Frontend sends request to /api/permit-requirements
    ↓
Backend checks Supabase cache
    ├─ Found? → Return cached data
    └─ Not found?
        ↓
    Try to find & scrape gov website
        ├─ Success? → Return scraped data + save to cache
        └─ Fail?
            ↓
        Return comprehensive fallback data + save to cache
    ↓
Frontend displays beautiful results page
```

## 🎯 Quick Customization Tips

### Change Colors
Edit `src/App.css` line 1-10:
```css
:root {
  --color-primary: #ff6b35;  /* Change main color */
  --color-accent: #ffd93d;   /* Change accent */
}
```

### Add Project Types
Edit `src/App.jsx` line 15:
```javascript
const projectTypes = [
  'Your New Type',
  // ... existing types
];
```

Then add permit data in `server/server.js` in `getPermitsByProjectType()`

### Improve Data Sources
Best options:
1. Pre-populate database with known city data
2. Add Google Custom Search API integration
3. Partner with government API providers
4. Build web scraping for specific city patterns

## 🐛 Common Issues

**"Cannot connect to backend"**
- Make sure both servers are running
- Check port 3001 isn't in use
- Verify proxy in vite.config.js

**"Supabase error"**
- Double-check URL and key in .env
- Verify RLS policies were created
- Check Supabase project is active

**"No results returned"**
- Check backend logs for errors
- Try different city/state
- Verify fallback data is working

## 📈 Next Steps

1. **Deploy to production**
   - Frontend → Vercel/Netlify (free)
   - Backend → Railway/Render (free tier)

2. **Improve data quality**
   - Add real government API integrations
   - Pre-populate database with major cities
   - Build city-specific scrapers

3. **Add features**
   - PDF export of requirements
   - Email notifications
   - Map integration
   - User accounts

4. **Analytics**
   - Track popular searches
   - Monitor conversion rates
   - Analyze user patterns

## 🎓 Architecture Decisions Explained

**Why React?**
- Large ecosystem, easy to find help
- Great for dynamic UIs
- Component reusability

**Why Express?**
- Simple, unopinionated
- Perfect for REST APIs
- Easy to add middleware

**Why Supabase?**
- PostgreSQL is robust
- Free tier is generous
- Real-time capabilities
- Auto-generated APIs
- Built-in auth (for future)
- Easy scaling

**Why Vite?**
- Fast development server
- Modern build tool
- Better DX than Create React App

## 💡 Pro Tips

1. **Cache is king**: The 24-hour cache dramatically reduces API calls and improves speed
2. **Fallback data**: Always have comprehensive fallback data for reliability
3. **Start simple**: Get it working with fallback data, then add real scrapers
4. **Monitor Supabase**: Watch your database size and query performance
5. **User feedback**: Add a feedback button to learn what users need

## 📚 Learning Resources

- React: https://react.dev
- Express: https://expressjs.com
- Supabase: https://supabase.com/docs
- Vite: https://vitejs.dev

Happy coding! 🚀
