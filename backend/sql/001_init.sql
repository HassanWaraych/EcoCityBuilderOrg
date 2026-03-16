CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS players (
  player_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar(50) NOT NULL UNIQUE,
  email varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  total_games integer NOT NULL DEFAULT 0,
  best_score integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS game_sessions (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  city_name varchar(100) NOT NULL,
  difficulty varchar(20) NOT NULL DEFAULT 'normal',
  current_turn smallint NOT NULL DEFAULT 1 CHECK (current_turn BETWEEN 1 AND 15),
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'lost')),
  happiness smallint NOT NULL DEFAULT 50 CHECK (happiness BETWEEN 0 AND 100),
  env_health smallint NOT NULL DEFAULT 70 CHECK (env_health BETWEEN 0 AND 100),
  economy smallint NOT NULL DEFAULT 50 CHECK (economy BETWEEN 0 AND 100),
  carbon_footprint integer NOT NULL DEFAULT 1000,
  budget integer NOT NULL DEFAULT 100000,
  population integer NOT NULL DEFAULT 10000,
  final_score integer,
  result_tier varchar(40),
  loss_reason varchar(40),
  state_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  pending_projects jsonb NOT NULL DEFAULT '[]'::jsonb,
  pending_event jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

CREATE TABLE IF NOT EXISTS decisions (
  decision_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES game_sessions(session_id) ON DELETE CASCADE,
  turn_number smallint NOT NULL,
  action_type varchar(50) NOT NULL,
  action_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  delta_happiness smallint NOT NULL DEFAULT 0,
  delta_env smallint NOT NULL DEFAULT 0,
  delta_economy smallint NOT NULL DEFAULT 0,
  delta_carbon integer NOT NULL DEFAULT 0,
  cost integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decisions_session_id ON decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_decisions_session_turn ON decisions(session_id, turn_number);

CREATE TABLE IF NOT EXISTS achievements (
  achievement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(player_id) ON DELETE CASCADE,
  session_id uuid REFERENCES game_sessions(session_id) ON DELETE CASCADE,
  achievement_type varchar(50) NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, session_id, achievement_type)
);

CREATE INDEX IF NOT EXISTS idx_achievements_player_id ON achievements(player_id);
