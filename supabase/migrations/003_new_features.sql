-- Migration 003: New features - Announcements, Counseling Resources, Notifications, Saved Devotionals
-- Created: 2026-09-02

-- ─── Announcements ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'event', 'prayer', 'volunteer', 'celebration', 'urgent')) DEFAULT 'general',
  display_date DATE,
  expires_at DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own announcements" ON announcements FOR ALL USING (auth.uid() = profile_id);

-- ─── Counseling Resources ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS counseling_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('grief', 'marriage', 'anxiety', 'addiction', 'depression', 'family', 'faith_crisis', 'anger', 'forgiveness', 'parenting', 'finances', 'loneliness', 'other')) DEFAULT 'other',
  content TEXT NOT NULL,
  scripture_references TEXT[],
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE counseling_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own resources" ON counseling_resources FOR ALL USING (auth.uid() = profile_id);

-- ─── Notifications ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('study', 'care', 'sermon', 'announcement', 'system')) DEFAULT 'system',
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notifications" ON notifications FOR ALL USING (auth.uid() = profile_id);

-- ─── Saved Devotionals ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saved_devotionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sermon_id UUID REFERENCES sermons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  days INTEGER NOT NULL DEFAULT 5,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE saved_devotionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own devotionals" ON saved_devotionals FOR ALL USING (auth.uid() = profile_id);

-- ─── Notification Preferences (add to profiles) ─────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_poll_minutes INTEGER DEFAULT 5;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
