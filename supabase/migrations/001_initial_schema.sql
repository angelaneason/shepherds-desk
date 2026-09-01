-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: churches
CREATE TABLE public.churches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#082C50' NOT NULL,
    secondary_color TEXT DEFAULT '#D0A348' NOT NULL,
    accent_color TEXT DEFAULT '#F8F5EE' NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    church_id UUID NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'pastor' NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: sermons
CREATE TABLE public.sermons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subtitle TEXT,
    content JSONB,
    status TEXT NOT NULL CHECK (status IN ('draft', 'review', 'ready', 'preached')) DEFAULT 'draft',
    preach_date DATE,
    series_name TEXT,
    series_order INTEGER,
    scripture_primary TEXT,
    scriptures_all TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: sermon_tags
CREATE TABLE public.sermon_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sermon_id UUID NOT NULL REFERENCES public.sermons(id) ON DELETE CASCADE,
    tag_type TEXT NOT NULL CHECK (tag_type IN ('topic', 'scripture', 'holiday', 'custom')),
    tag_value TEXT NOT NULL,
    UNIQUE(sermon_id, tag_type, tag_value)
);

-- Table: ideas
CREATE TABLE public.ideas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('photo', 'typed', 'voice')),
    photo_url TEXT,
    ocr_text TEXT,
    promoted_to_sermon UUID REFERENCES public.sermons(id) ON DELETE SET NULL,
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: calendar_events
CREATE TABLE public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('sermon_study', 'meeting', 'visit', 'personal', 'service')),
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT false,
    recurrence_rule TEXT,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: members
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'visitor')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: care_tasks
CREATE TABLE public.care_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL CHECK (task_type IN ('visit', 'hospital', 'call', 'ride', 'deacon_request', 'other')),
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
    priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'urgent')) DEFAULT 'normal',
    due_date DATE,
    completed_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sermons_author_id ON public.sermons(author_id);
CREATE INDEX idx_sermons_status ON public.sermons(status);
CREATE INDEX idx_sermons_preach_date ON public.sermons(preach_date);
CREATE INDEX idx_ideas_profile_id ON public.ideas(profile_id);
CREATE INDEX idx_calendar_events_profile_id ON public.calendar_events(profile_id);
CREATE INDEX idx_members_profile_id ON public.members(profile_id);
CREATE INDEX idx_care_tasks_profile_id ON public.care_tasks(profile_id);

-- RLS setup
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sermon_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_tasks ENABLE ROW LEVEL SECURITY;

-- Policies

-- churches: access their own church
CREATE POLICY "Users can view their own church"
ON public.churches FOR SELECT
USING (id IN (SELECT church_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own church"
ON public.churches FOR UPDATE
USING (id IN (SELECT church_id FROM public.profiles WHERE id = auth.uid()));

-- profiles: view their own or same church
CREATE POLICY "Users can view profiles in their church"
ON public.profiles FOR SELECT
USING (church_id IN (SELECT church_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- sermons: users can access rows where author_id matches their profile
CREATE POLICY "Users can view own sermons"
ON public.sermons FOR SELECT USING (author_id = auth.uid());

CREATE POLICY "Users can insert own sermons"
ON public.sermons FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own sermons"
ON public.sermons FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete own sermons"
ON public.sermons FOR DELETE USING (author_id = auth.uid());

-- sermon_tags: access through sermon
CREATE POLICY "Users can view own sermon tags"
ON public.sermon_tags FOR SELECT
USING (sermon_id IN (SELECT id FROM public.sermons WHERE author_id = auth.uid()));

CREATE POLICY "Users can insert own sermon tags"
ON public.sermon_tags FOR INSERT
WITH CHECK (sermon_id IN (SELECT id FROM public.sermons WHERE author_id = auth.uid()));

CREATE POLICY "Users can update own sermon tags"
ON public.sermon_tags FOR UPDATE
USING (sermon_id IN (SELECT id FROM public.sermons WHERE author_id = auth.uid()));

CREATE POLICY "Users can delete own sermon tags"
ON public.sermon_tags FOR DELETE
USING (sermon_id IN (SELECT id FROM public.sermons WHERE author_id = auth.uid()));

-- ideas
CREATE POLICY "Users can view own ideas"
ON public.ideas FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own ideas"
ON public.ideas FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own ideas"
ON public.ideas FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own ideas"
ON public.ideas FOR DELETE USING (profile_id = auth.uid());

-- calendar_events
CREATE POLICY "Users can view own events"
ON public.calendar_events FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own events"
ON public.calendar_events FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own events"
ON public.calendar_events FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own events"
ON public.calendar_events FOR DELETE USING (profile_id = auth.uid());

-- members
CREATE POLICY "Users can view own members"
ON public.members FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own members"
ON public.members FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own members"
ON public.members FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own members"
ON public.members FOR DELETE USING (profile_id = auth.uid());

-- care_tasks
CREATE POLICY "Users can view own care tasks"
ON public.care_tasks FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own care tasks"
ON public.care_tasks FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own care tasks"
ON public.care_tasks FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Users can delete own care tasks"
ON public.care_tasks FOR DELETE USING (profile_id = auth.uid());


-- Trigger to auto-create church and profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_church_id UUID;
BEGIN
    -- Create a default church for the user
    INSERT INTO public.churches (name)
    VALUES (COALESCE(new.raw_user_meta_data->>'church_name', 'My Church'))
    RETURNING id INTO new_church_id;

    -- Create profile linked to the new church
    INSERT INTO public.profiles (id, church_id, full_name, email, role)
    VALUES (
        new.id,
        new_church_id,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Pastor'),
        new.email,
        'pastor'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
