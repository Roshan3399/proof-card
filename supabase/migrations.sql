-- Ship Database Schema

-- Users (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  age INTEGER NOT NULL CHECK (age >= 13 AND age <= 19),
  bio TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  email_digest BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seasons
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cohorts (users in a season)
CREATE TABLE IF NOT EXISTS cohorts (
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (season_id, user_id)
);

-- Builds
CREATE TABLE IF NOT EXISTS builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('code', 'design', 'writing', 'hardware', 'ai', 'other')),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'building', 'testing', 'shipped')),
  season_id UUID REFERENCES seasons(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  shipped_at TIMESTAMPTZ
);

-- Daily logs (one per build per day)
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  github_verified BOOLEAN DEFAULT FALSE,
  github_commits_count INTEGER DEFAULT 0,
  github_repos_touched TEXT[] DEFAULT '{}',
  github_languages TEXT[] DEFAULT '{}',
  UNIQUE (build_id, log_date)
);

-- Endorsements (manual, added by founder)
CREATE TABLE IF NOT EXISTS endorsements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  endorser_name TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GitHub connections
CREATE TABLE IF NOT EXISTS github_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_id BIGINT NOT NULL UNIQUE,
  github_username VARCHAR(64) NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ
);

-- GitHub repos
CREATE TABLE IF NOT EXISTS github_repos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL,
  name VARCHAR(128) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  description TEXT,
  repo_created_at TIMESTAMPTZ,
  repo_updated_at TIMESTAMPTZ,
  pushed_at TIMESTAMPTZ,
  language VARCHAR(64),
  stargazers_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  UNIQUE (user_id, github_repo_id)
);

-- GitHub commits
CREATE TABLE IF NOT EXISTS github_commits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id UUID NOT NULL REFERENCES github_repos(id) ON DELETE CASCADE,
  sha VARCHAR(40) NOT NULL,
  message TEXT,
  author_date TIMESTAMPTZ,
  committer_date TIMESTAMPTZ,
  url TEXT,
  UNIQUE (repo_id, sha)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_builds_user_id ON builds(user_id);
CREATE INDEX IF NOT EXISTS idx_builds_season_id ON builds(season_id);
CREATE INDEX IF NOT EXISTS idx_builds_status ON builds(status);
CREATE INDEX IF NOT EXISTS idx_logs_build_id ON logs(build_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
CREATE INDEX IF NOT EXISTS idx_cohorts_season_id ON cohorts(season_id);
CREATE INDEX IF NOT EXISTS idx_github_connections_user_id ON github_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_github_repos_user_id ON github_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_github_commits_repo_id ON github_commits(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_commits_author_date ON github_commits(author_date);


-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE endorsements ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Builds
DROP POLICY IF EXISTS "Anyone can view shipped builds" ON builds;
CREATE POLICY "Anyone can view shipped builds"
  ON builds FOR SELECT
  USING (status = 'shipped' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create builds" ON builds;
CREATE POLICY "Users can create builds"
  ON builds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own builds" ON builds;
CREATE POLICY "Users can update own builds"
  ON builds FOR UPDATE
  USING (auth.uid() = user_id AND status != 'shipped');

DROP POLICY IF EXISTS "Users can delete own builds" ON builds;
CREATE POLICY "Users can delete own builds"
  ON builds FOR DELETE
  USING (auth.uid() = user_id);

-- Logs
DROP POLICY IF EXISTS "Anyone can view logs of shipped builds" ON logs;
CREATE POLICY "Anyone can view logs of shipped builds"
  ON logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM builds WHERE builds.id = logs.build_id AND (builds.status = 'shipped' OR builds.user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Users can create logs on own builds" ON logs;
CREATE POLICY "Users can create logs on own builds"
  ON logs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM builds WHERE builds.id = logs.build_id AND builds.user_id = auth.uid() AND builds.status != 'shipped')
  );

DROP POLICY IF EXISTS "Users can update own logs within 24h" ON logs;
CREATE POLICY "Users can update own logs within 24h"
  ON logs FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM builds WHERE builds.id = logs.build_id)
    AND created_at > NOW() - INTERVAL '24 hours'
  );

-- Seasons
DROP POLICY IF EXISTS "Anyone can view seasons" ON seasons;
CREATE POLICY "Anyone can view seasons"
  ON seasons FOR SELECT
  USING (true);

-- Cohorts
DROP POLICY IF EXISTS "Anyone can view cohorts" ON cohorts;
CREATE POLICY "Anyone can view cohorts"
  ON cohorts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can join cohorts" ON cohorts;
CREATE POLICY "Users can join cohorts"
  ON cohorts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Endorsements
DROP POLICY IF EXISTS "Anyone can view endorsements" ON endorsements;
CREATE POLICY "Anyone can view endorsements"
  ON endorsements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only founder can add endorsements" ON endorsements;
CREATE POLICY "Only founder can add endorsements"
  ON endorsements FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM builds WHERE builds.id = build_id));

-- Insert default season
INSERT INTO seasons (name, start_date, end_date, is_active)
VALUES ('Season 1', CURRENT_DATE, CURRENT_DATE + INTERVAL '12 weeks', true)
ON CONFLICT DO NOTHING;
