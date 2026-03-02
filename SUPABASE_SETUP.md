# Supabase Database Setup Guide

## 1. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up for a free account
3. Create a new project
4. Note your project URL and anon/public API key

## 2. Database Schema

Run the following SQL in the Supabase SQL Editor to create your tables:

```sql
-- Table for storing user emails
CREATE TABLE user_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  city TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX idx_user_emails_created_at ON user_emails(created_at DESC);
CREATE INDEX idx_user_emails_email ON user_emails(email);

-- Table for caching permit data
CREATE TABLE permit_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  project_type TEXT NOT NULL,
  permit_info JSONB NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(city, state, project_type)
);

-- Add indexes for faster lookups
CREATE INDEX idx_permit_data_location ON permit_data(city, state);
CREATE INDEX idx_permit_data_lookup ON permit_data(city, state, project_type);

-- Enable Row Level Security (RLS)
ALTER TABLE user_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_data ENABLE ROW LEVEL SECURITY;

-- Create policies for user_emails
CREATE POLICY "Enable insert for all users" ON user_emails
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for all users" ON user_emails
  FOR SELECT USING (true);

-- Create policies for permit_data
CREATE POLICY "Enable insert for all users" ON permit_data
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for all users" ON permit_data
  FOR SELECT USING (true);

CREATE POLICY "Enable update for all users" ON permit_data
  FOR UPDATE USING (true);
```

## 3. Configure Environment Variables

1. Copy `.env.example` to `.env` in the server directory
2. Fill in your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
PORT=3001
```

## 4. Optional: Set up Email Notifications

If you want to send emails to users who provide their email addresses:

```sql
-- Create a function to send emails when new emails are added
CREATE OR REPLACE FUNCTION send_permit_info_email()
RETURNS TRIGGER AS $$
BEGIN
  -- This is a placeholder - you'd integrate with a service like SendGrid or Resend
  -- Example: Call an edge function or external API
  PERFORM net.http_post(
    url := 'your-email-service-endpoint',
    body := json_build_object(
      'to', NEW.email,
      'subject', 'Your Permit Information',
      'city', NEW.city,
      'state', NEW.state
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_email_insert
  AFTER INSERT ON user_emails
  FOR EACH ROW
  EXECUTE FUNCTION send_permit_info_email();
```

## 5. Optional: Analytics Table

Track searches and popular locations:

```sql
CREATE TABLE search_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  project_type TEXT NOT NULL,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_search_analytics_date ON search_analytics(searched_at DESC);
CREATE INDEX idx_search_analytics_location ON search_analytics(city, state);

ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for all users" ON search_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read for all users" ON search_analytics
  FOR SELECT USING (true);
```

## 6. Supabase Dashboard Features

### Viewing Data
- Go to Table Editor to view and manage your data
- Use SQL Editor for custom queries
- Check Database > Roles for user management

### Monitoring
- Database > Reports shows usage statistics
- Logs show query performance

### API Documentation
- Auto-generated API docs available at: Settings > API

## 7. Security Best Practices

1. **Never expose your service_role key** - only use the anon key in frontend
2. **Enable RLS** on all tables (already done above)
3. **Use policies** to control access
4. **Rotate keys** periodically from Settings > API
5. **Monitor usage** to prevent abuse

## 8. Scaling Considerations

Free tier limits:
- 500 MB database space
- 1 GB file storage
- 2 GB bandwidth per month
- 50,000 monthly active users

For production:
- Consider Pro plan ($25/month) for better performance
- Set up backups (automatic in Pro)
- Use database indexes for faster queries
- Implement caching strategy

## 9. Supabase Client Usage in Code

The server already includes the Supabase client setup. Example queries:

```javascript
// Insert email
const { data, error } = await supabase
  .from('user_emails')
  .insert([{ email: 'user@example.com', city: 'Austin', state: 'TX' }]);

// Query permit data
const { data, error } = await supabase
  .from('permit_data')
  .select('*')
  .eq('city', 'austin')
  .eq('state', 'TX')
  .single();

// Update permit data
const { data, error } = await supabase
  .from('permit_data')
  .upsert([{ city: 'austin', state: 'TX', project_type: 'Residential', permit_info: {...} }]);
```

## 10. Troubleshooting

**Connection Issues:**
- Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Check network connectivity
- Ensure RLS policies allow access

**Query Performance:**
- Use indexes (already created above)
- Check Database > Reports for slow queries
- Consider database optimization

**Storage Issues:**
- Monitor database size in Dashboard
- Clean up old data periodically
- Upgrade plan if needed

## Next Steps

1. Run the SQL schema creation queries
2. Configure your .env file
3. Test the connection by starting the server
4. Monitor logs for any errors
