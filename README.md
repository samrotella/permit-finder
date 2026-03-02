# PermitFinder - Construction Permit Lookup Tool

A modern web application that helps users find exact construction permit requirements for their location and project type. Built with React, Node.js, and Supabase.

## Features

- ✅ **City-level permit lookup** - Find requirements by city and state
- ✅ **Optional email capture** - Users can optionally provide email for follow-up
- ✅ **All project types** - Supports residential, commercial, electrical, plumbing, and more
- ✅ **Government data integration** - Fetches real permit requirements from official sources
- ✅ **Smart caching** - Stores permit data to reduce API calls and improve performance
- ✅ **Beautiful UI** - Modern, responsive design with smooth animations
- ✅ **Supabase database** - Easy-to-use PostgreSQL backend

## Tech Stack

**Frontend:**
- React 18
- Vite (build tool)
- Custom CSS with sophisticated styling

**Backend:**
- Node.js + Express
- Axios (HTTP requests)
- Cheerio (web scraping)
- Supabase (database)

**Database:**
- PostgreSQL via Supabase
- Tables: user_emails, permit_data

## Project Structure

```
permit-finder/
├── src/                    # Frontend React app
│   ├── App.jsx            # Main React component
│   ├── App.css            # Styling
│   └── main.jsx           # React entry point
├── server/                 # Backend API
│   ├── server.js          # Express server
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Environment variables template
├── index.html             # HTML entry point
├── vite.config.js         # Vite configuration
├── package.json           # Frontend dependencies
├── SUPABASE_SETUP.md      # Database setup guide
└── README.md              # This file
```

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Git

### 1. Clone and Install

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Set Up Supabase

Follow the detailed instructions in `SUPABASE_SETUP.md`:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from SUPABASE_SETUP.md in your Supabase SQL Editor
3. Copy your project URL and anon key

### 3. Configure Environment Variables

```bash
# In the server directory
cd server
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=3001
```

### 4. Run the Application

**Terminal 1 - Frontend:**
```bash
npm run dev
```
Frontend will run on http://localhost:3000

**Terminal 2 - Backend:**
```bash
cd server
npm run dev
```
Backend will run on http://localhost:3001

### 5. Test the App

1. Open http://localhost:3000
2. Fill in the form:
   - Email (optional)
   - City (e.g., "San Francisco")
   - State (e.g., "CA")
   - Project Type (e.g., "Residential - New Construction")
3. Click "Find Permit Requirements"

## How It Works

### Frontend Flow
1. User fills out the form (email is optional)
2. Form data is sent to the backend API
3. Results are displayed with permit requirements, documents, steps, and contact info

### Backend Flow
1. Check if data exists in Supabase cache
2. If not cached, attempt to find official building department website
3. Scrape website for permit information
4. Fall back to general permit data based on project type
5. Save results to Supabase for future requests
6. Return data to frontend

### Data Sources Strategy

The backend uses a multi-tier approach:

1. **Supabase Cache** - Check database first (fastest)
2. **Government Websites** - Attempt to scrape official sources
3. **Fallback Data** - Use comprehensive general permit info

### Email Collection

- **Non-blocking**: Users can skip email entry
- **Purpose**: Optional follow-up and analytics
- **Storage**: Emails saved to Supabase with location data
- **Privacy**: Only used internally, never shared

## API Endpoints

### POST /api/save-email
Save user email for follow-up

**Request:**
```json
{
  "email": "user@example.com",
  "city": "Austin",
  "state": "TX",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### POST /api/permit-requirements
Get permit requirements for a location and project type

**Request:**
```json
{
  "city": "Austin",
  "state": "TX",
  "projectType": "Residential - New Construction"
}
```

**Response:**
```json
{
  "permitOffice": {
    "name": "Austin Building Department",
    "phone": "(512) 978-4000",
    "website": "https://austintexas.gov/building",
    "address": "6310 Wilhelmina Delco Dr, Austin, TX"
  },
  "requiredPermits": [
    {
      "name": "Building Permit",
      "description": "Required for new residential construction",
      "estimatedCost": "$2,000 - $15,000"
    }
  ],
  "requiredDocuments": [
    "Completed permit application form",
    "Site plan showing property boundaries"
  ],
  "steps": [
    "Review local zoning requirements",
    "Submit permit application"
  ],
  "estimatedTimeline": "6-12 weeks for approval",
  "additionalInfo": "Verify with local department",
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

## Customization

### Adding More Project Types

Edit the `projectTypes` array in `src/App.jsx`:

```javascript
const projectTypes = [
  'Your New Project Type',
  // ... existing types
];
```

And add permit data in `server/server.js` in the `getPermitsByProjectType` function.

### Styling

All styles are in `src/App.css`. The design uses:
- CSS custom properties (variables) for easy theming
- Dark theme with orange/yellow accents
- Grain texture overlay
- Smooth animations

To change colors, edit the `:root` variables:

```css
:root {
  --color-primary: #ff6b35;  /* Main brand color */
  --color-accent: #ffd93d;   /* Accent color */
  /* ... other colors */
}
```

### Improving Data Quality

**Option 1: Use Google Custom Search API**

Add to `.env`:
```env
GOOGLE_API_KEY=your_api_key
GOOGLE_SEARCH_ENGINE_ID=your_engine_id
```

Then enhance `findBuildingDepartmentWebsite()` function.

**Option 2: Manual City Data Entry**

Pre-populate the database with known city data:

```sql
INSERT INTO permit_data (city, state, project_type, permit_info)
VALUES (
  'austin',
  'TX',
  'Residential - New Construction',
  '{"permitOffice": {...}, "requiredPermits": [...]}'::jsonb
);
```

## Deployment

### Frontend (Vercel/Netlify)

1. Build the frontend:
```bash
npm run build
```

2. Deploy the `dist` folder to Vercel, Netlify, or any static host

3. Set environment variable:
```
VITE_API_URL=https://your-backend-url.com
```

### Backend (Railway/Render/Heroku)

1. Push to GitHub
2. Connect repository to Railway/Render
3. Set environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, PORT)
4. Deploy

### Full-Stack Deployment Tips

- Use CORS configuration in production
- Set up proper error logging (e.g., Sentry)
- Enable rate limiting to prevent abuse
- Monitor Supabase usage
- Set up analytics (Google Analytics, Plausible)

## Performance Optimization

1. **Caching**: 24-hour cache for permit data
2. **Database Indexing**: Indexed lookups by city/state
3. **Lazy Loading**: Components load as needed
4. **Compression**: Gzip response compression
5. **CDN**: Serve static assets via CDN

## Security

- ✅ Environment variables for secrets
- ✅ Row Level Security (RLS) enabled in Supabase
- ✅ Input validation on backend
- ✅ CORS configured
- ✅ Rate limiting recommended for production
- ✅ HTTPS required in production

## Troubleshooting

**Frontend won't connect to backend:**
- Check that both servers are running
- Verify proxy config in `vite.config.js`
- Check browser console for CORS errors

**Database connection fails:**
- Verify SUPABASE_URL and SUPABASE_ANON_KEY in `.env`
- Check Supabase project is active
- Review RLS policies in Supabase

**No permit data returned:**
- Check backend logs for scraping errors
- Verify city/state spelling
- Review fallback data in `getPermitsByProjectType()`

**Styling issues:**
- Clear browser cache
- Check for CSS syntax errors
- Verify font imports loading

## Future Enhancements

- [ ] Add map visualization of permit office location
- [ ] Email notification system for permit updates
- [ ] PDF export of permit requirements
- [ ] User accounts and saved searches
- [ ] Admin panel for managing permit data
- [ ] Integration with more government APIs
- [ ] Mobile app (React Native)
- [ ] Multilingual support
- [ ] AI-powered permit requirement predictions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for your needs.

## Support

For issues and questions:
- Check existing documentation
- Review Supabase setup guide
- Open an issue on GitHub

## Acknowledgments

- Built with React and Express
- Database powered by Supabase
- Fonts from Google Fonts (Crimson Pro, DM Sans)
- Icons and animations custom-built

---

**Note**: This tool provides general permit information. Always verify requirements with your local building department as regulations vary by jurisdiction and change over time.
