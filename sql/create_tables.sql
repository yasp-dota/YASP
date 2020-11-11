CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS tsm_system_rows;

CREATE TABLE IF NOT EXISTS matches (
  match_id bigint PRIMARY KEY,
  match_seq_num bigint,
  radiant_win boolean,
  start_time integer,
  duration integer,
  tower_status_radiant integer,
  tower_status_dire integer,
  barracks_status_radiant integer,
  barracks_status_dire integer,
  cluster integer,
  first_blood_time integer,
  lobby_type integer,
  human_players integer,
  leagueid integer,
  positive_votes integer,
  negative_votes integer,
  game_mode integer,
  engine integer,
  radiant_score integer,
  dire_score integer,
  picks_bans json[],
  radiant_team_id integer,
  dire_team_id integer,
  radiant_team_name varchar(255),
  dire_team_name varchar(255),
  radiant_team_complete smallint,
  dire_team_complete smallint,
  radiant_captain bigint,
  dire_captain bigint,
  chat json[],
  objectives json[],
  radiant_gold_adv integer[],
  radiant_xp_adv integer[],
  teamfights json[],
  draft_timings json[],
  version integer,
  cosmetics json,
  series_id integer,
  series_type integer
);
CREATE INDEX IF NOT EXISTS matches_leagueid_idx on matches(leagueid) WHERE leagueid > 0;
CREATE INDEX IF NOT EXISTS matches_start_time_idx on matches(start_time);

CREATE TABLE IF NOT EXISTS player_matches (
  PRIMARY KEY(match_id, player_slot),
  match_id bigint REFERENCES matches(match_id) ON DELETE CASCADE,
  account_id bigint,
  player_slot integer,
  hero_id integer,
  item_0 integer,
  item_1 integer,
  item_2 integer,
  item_3 integer,
  item_4 integer,
  item_5 integer,
  item_neutral integer,
  backpack_0 integer,
  backpack_1 integer,
  backpack_2 integer,
  backpack_3 integer,
  kills integer,
  deaths integer,
  assists integer,
  leaver_status integer,
  gold integer,
  last_hits integer,
  denies integer,
  gold_per_min integer,
  xp_per_min integer,
  gold_spent integer,
  hero_damage integer,
  tower_damage bigint,
  hero_healing bigint,
  level integer,
  --ability_upgrades json[],
  additional_units json[],
  --parsed fields below
  stuns real,
  max_hero_hit json,
  times integer[],
  gold_t integer[],
  lh_t integer[],
  dn_t integer[],
  xp_t integer[],
  obs_log json[],
  sen_log json[],
  obs_left_log json[],
  sen_left_log json[],
  starting_items json[],
  purchase_log json[],
  kills_log json[],
  buyback_log json[],
  runes_log json[],
  connection_log json[],
  lane_pos json,
  obs json,
  sen json,
  actions json,
  pings json,
  purchase json,
  gold_reasons json,
  xp_reasons json,
  killed json,
  item_uses json,
  ability_uses json,
  ability_targets json,
  damage_targets json,
  hero_hits json,
  damage json,
  damage_taken json,
  damage_inflictor json,
  runes json,
  killed_by json,
  kill_streaks json,
  multi_kills json,
  life_state json,
  damage_inflictor_received json,
  obs_placed int,
  sen_placed int,
  creeps_stacked int,
  camps_stacked int,
  rune_pickups int,
  ability_upgrades_arr integer[],
  party_id int,
  permanent_buffs json[],
  lane int,
  lane_role int,
  is_roaming boolean,
  firstblood_claimed int,
  teamfight_participation real,
  towers_killed int,
  roshans_killed int,
  observers_placed int,
  party_size int
);
CREATE INDEX IF NOT EXISTS player_matches_account_id_idx on player_matches(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS player_matches_hero_id_idx on player_matches(hero_id);

CREATE TABLE IF NOT EXISTS players (
  account_id bigint PRIMARY KEY,
  steamid varchar(32),
  avatar varchar(255),
  avatarmedium varchar(255),
  avatarfull varchar(255),
  profileurl varchar(255),
  personaname varchar(255),
  plus boolean DEFAULT false,
  last_login timestamp with time zone,
  full_history_time timestamp with time zone,
  cheese integer DEFAULT 0,
  fh_unavailable boolean,
  loccountrycode varchar(2),
  last_match_time timestamp with time zone
  /*
    "communityvisibilitystate" : 3,
    "lastlogoff" : 1426020853,
    "loccityid" : 44807,
    "locstatecode" : "16",
    "personastate" : 0,
    "personastateflags" : 0,
    "primaryclanid" : "103582791433775490",
    "profilestate" : 1,
    "realname" : "Alper",
    "timecreated" : 1332289262,
  */
);
CREATE INDEX IF NOT EXISTS players_cheese_idx on players(cheese) WHERE cheese IS NOT NULL AND cheese > 0;
CREATE INDEX IF NOT EXISTS players_personaname_idx_gin ON players USING GIN(personaname gin_trgm_ops);

CREATE TABLE IF NOT EXISTS player_ratings (
  PRIMARY KEY(account_id, time),
  account_id bigint,
  match_id bigint,
  solo_competitive_rank integer,
  competitive_rank integer,
  time timestamp with time zone
);

CREATE TABLE IF NOT EXISTS subscriptions (
  PRIMARY KEY(customer_id),
  account_id bigint REFERENCES players(account_id) ON DELETE CASCADE,
  customer_id varchar(255),
  amount int,
  active_until date
);
CREATE INDEX IF NOT EXISTS subscriptions_account_id_idx on subscriptions(account_id);
CREATE INDEX IF NOT EXISTS subscriptions_customer_id_idx on subscriptions(customer_id);

CREATE TABLE IF NOT EXISTS webhooks (
  PRIMARY KEY(hook_id),
  hook_id uuid UNIQUE,
  account_id bigint,
  url text NOT NULL,
  subscriptions jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS webhooks_account_id_idx on webhooks(account_id);

CREATE TABLE IF NOT EXISTS api_keys (
  PRIMARY KEY(account_id),
  account_id bigint UNIQUE,
  api_key uuid UNIQUE,
  customer_id text NOT NULL,
  subscription_id text NOT NULL
);

CREATE TABLE IF NOT EXISTS api_key_usage (
  PRIMARY KEY(account_id, api_key, ip, timestamp),
  account_id bigint REFERENCES api_keys(account_id),
  customer_id text,
  api_key uuid,
  usage_count bigint,
  ip text,
  timestamp timestamp default current_timestamp
);
CREATE INDEX IF NOT EXISTS api_keys_usage_account_id_idx on api_key_usage(account_id);
CREATE INDEX IF NOT EXISTS api_keys_usage_timestamp_idx on api_key_usage(timestamp);

CREATE TABLE IF NOT EXISTS user_usage (
  account_id bigint,
  ip text,
  usage_count bigint,
  timestamp timestamp default current_timestamp
);
CREATE INDEX IF NOT EXISTS user_usage_account_id_idx on user_usage(account_id);
CREATE INDEX IF NOT EXISTS user_usage_timestamp_idx on user_usage(timestamp);
CREATE UNIQUE INDEX IF NOT EXISTS user_usage_unique_idx on user_usage(account_id, ip, timestamp);

CREATE TABLE IF NOT EXISTS notable_players (
  account_id bigint PRIMARY KEY,
  name varchar(255),
  country_code varchar(2),
  fantasy_role int,
  team_id int,
  team_name varchar(255),
  team_tag varchar(255),
  is_locked boolean,
  is_pro boolean,
  locked_until integer
);

CREATE TABLE IF NOT EXISTS match_logs (
  match_id bigint REFERENCES matches(match_id) ON DELETE CASCADE,
  time int,
  type varchar(100),
  team smallint,
  unit varchar(100),
  key varchar(1000),
  value int,
  slot smallint,
  player_slot smallint,
  player1 int,
  player2 int,
  attackerhero boolean,
  targethero boolean,
  attackerillusion boolean,
  targetillusion boolean,
  inflictor varchar(100),
  gold_reason smallint,
  xp_reason smallint,
  attackername varchar(100),
  targetname varchar(100),
  sourcename varchar(100),
  targetsourcename varchar(100),
  valuename varchar(100),
  gold int,
  lh int,
  xp int,
  x smallint,
  y smallint,
  z smallint,
  entityleft boolean,
  ehandle int,
  stuns real,
  hero_id smallint,
  life_state smallint,
  level smallint,
  kills smallint,
  deaths smallint,
  assists smallint,
  denies smallint,
  attackername_slot smallint,
  targetname_slot smallint,
  sourcename_slot smallint,
  targetsourcename_slot smallint,
  player1_slot smallint,
  obs_placed int,
  sen_placed int,
  creeps_stacked int,
  camps_stacked int,
  rune_pickups int
);
CREATE INDEX IF NOT EXISTS match_logs_match_id_idx ON match_logs(match_id);
CREATE INDEX IF NOT EXISTS match_logs_match_id_player_slot_idx ON match_logs(match_id, player_slot) WHERE player_slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS match_logs_match_id_player1_slot_idx ON match_logs(match_id, player1_slot) WHERE player1_slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS match_logs_match_id_attackername_slot_idx ON match_logs(match_id, attackername_slot) WHERE attackername_slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS match_logs_match_id_targetname_slot_idx ON match_logs(match_id, targetname_slot) WHERE targetname_slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS match_logs_match_id_sourcename_slot_idx ON match_logs(match_id, sourcename_slot) WHERE sourcename_slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS match_logs_match_id_targetsourcename_slot_idx ON match_logs(match_id, targetsourcename_slot) WHERE targetsourcename_slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS match_logs_match_id_valuename_idx ON match_logs(match_id, valuename) WHERE valuename IS NOT NULL;
CREATE INDEX IF NOT EXISTS match_logs_match_id_type_idx ON match_logs(match_id, type);
CREATE INDEX IF NOT EXISTS match_logs_valuename_idx ON match_logs(valuename) WHERE valuename IS NOT NULL;
CREATE INDEX IF NOT EXISTS match_logs_type_idx ON match_logs(type);

CREATE TABLE IF NOT EXISTS picks_bans(
  match_id bigint REFERENCES matches(match_id) ON DELETE CASCADE,
  is_pick boolean,
  hero_id int,
  team smallint,
  ord smallint,
  PRIMARY KEY (match_id, ord)
);

CREATE TABLE IF NOT EXISTS leagues(
  leagueid bigint PRIMARY KEY,
  ticket varchar(255),
  banner varchar(255),
  tier varchar(255),
  name varchar(255)
);

CREATE TABLE IF NOT EXISTS teams(
  team_id bigint PRIMARY KEY,
  name varchar(255),
  tag varchar(255),
  logo_url text
);

CREATE TABLE IF NOT EXISTS heroes(
  id int PRIMARY KEY,
  name text,
  localized_name text,
  primary_attr text,
  attack_type text,
  roles text[]
);

CREATE TABLE IF NOT EXISTS match_patch(
  match_id bigint REFERENCES matches(match_id) ON DELETE CASCADE PRIMARY KEY,
  patch text
);

CREATE TABLE IF NOT EXISTS team_match(
  team_id bigint,
  match_id bigint REFERENCES matches(match_id) ON DELETE CASCADE,
  radiant boolean,
  PRIMARY KEY(team_id, match_id)
);

CREATE TABLE IF NOT EXISTS match_gcdata(
  match_id bigint PRIMARY KEY,
  cluster int,
  replay_salt int,
  series_id int,
  series_type int
);

CREATE TABLE IF NOT EXISTS items(
  id int PRIMARY KEY,
  name text,
  cost int,
  secret_shop smallint,
  side_shop smallint,
  recipe smallint,
  localized_name text
);

CREATE TABLE IF NOT EXISTS cosmetics(
  item_id int PRIMARY KEY,
  name text,
  prefab text,
  creation_date timestamp with time zone,
  image_inventory text,
  image_path text,
  item_description text,
  item_name text,
  item_rarity text,
  item_type_name text,
  used_by_heroes text
);

CREATE TABLE IF NOT EXISTS public_matches (
  match_id bigint PRIMARY KEY,
  match_seq_num bigint,
  radiant_win boolean,
  start_time integer,
  duration integer,
  avg_mmr integer,
  num_mmr integer,
  lobby_type integer,
  game_mode integer,
  avg_rank_tier double precision,
  num_rank_tier integer,
  cluster integer
);
CREATE INDEX IF NOT EXISTS public_matches_start_time_idx on public_matches(start_time);
CREATE INDEX IF NOT EXISTS public_matches_avg_mmr_idx on public_matches(avg_mmr);
CREATE INDEX IF NOT EXISTS public_matches_avg_rank_tier_idx on public_matches(avg_rank_tier) WHERE avg_rank_tier IS NOT NULL;

CREATE TABLE IF NOT EXISTS public_player_matches (
  PRIMARY KEY(match_id, player_slot),
  match_id bigint REFERENCES public_matches(match_id) ON DELETE CASCADE,
  player_slot integer,
  hero_id integer
);
CREATE INDEX IF NOT EXISTS public_player_matches_hero_id_idx on public_player_matches(hero_id);
CREATE INDEX IF NOT EXISTS public_player_matches_match_id_idx on public_player_matches(match_id);

CREATE TABLE IF NOT EXISTS team_rating (
  PRIMARY KEY(team_id),
  team_id bigint,
  rating real,
  wins int,
  losses int,
  last_match_time bigint
);
CREATE INDEX IF NOT EXISTS team_rating_rating_idx ON team_rating(rating);

CREATE TABLE IF NOT EXISTS hero_ranking (
  PRIMARY KEY (account_id, hero_id),
  account_id bigint,
  hero_id int,
  score double precision
);
CREATE INDEX IF NOT EXISTS hero_ranking_hero_id_score_idx ON hero_ranking(hero_id, score);

CREATE TABLE IF NOT EXISTS queue (
  PRIMARY KEY (id),
  id bigserial,
  type text,
  timestamp timestamp with time zone,
  attempts int,
  data json,
  next_attempt_time timestamp with time zone,
  priority int
);
CREATE INDEX IF NOT EXISTS queue_priority_id_idx on queue(priority, id);

CREATE TABLE IF NOT EXISTS mmr_estimates (
  PRIMARY KEY (account_id),
  account_id bigint,
  estimate int
);

CREATE TABLE IF NOT EXISTS solo_competitive_rank (
  PRIMARY KEY (account_id),
  account_id bigint,
  rating int
);

CREATE TABLE IF NOT EXISTS competitive_rank (
  PRIMARY KEY (account_id),
  account_id bigint,
  rating int
);

CREATE TABLE IF NOT EXISTS rank_tier (
  PRIMARY KEY (account_id),
  account_id bigint,
  rating int
);
CREATE INDEX IF NOT EXISTS rank_tier_rating_idx ON rank_tier(rating);

CREATE TABLE IF NOT EXISTS leaderboard_rank (
  PRIMARY KEY (account_id),
  account_id bigint,
  rating int
);

CREATE TABLE IF NOT EXISTS scenarios (
  hero_id smallint,
  item text,
  time integer,
  lane_role smallint,
  games bigint DEFAULT 1,
  wins bigint,
  epoch_week integer,
  UNIQUE (hero_id, item, time, epoch_week),
  UNIQUE (hero_id, lane_role, time, epoch_week)
);

CREATE TABLE IF NOT EXISTS team_scenarios (
  scenario text,
  is_radiant boolean,
  region smallint,
  games bigint DEFAULT 1,
  wins bigint,
  epoch_week integer,
  UNIQUE (scenario, is_radiant, region, epoch_week)
);

CREATE TABLE IF NOT EXISTS hero_search (
  PRIMARY KEY (match_id),
  match_id bigint,
  teamA int[],
  teamB int[],
  teamAWin boolean,
  start_time int
);
CREATE INDEX IF NOT EXISTS hero_search_teamA_idx_gin ON hero_search USING GIN(teamA);
CREATE INDEX IF NOT EXISTS hero_search_teamB_idx_gin ON hero_search USING GIN(teamB);

CREATE TABLE IF NOT EXISTS parsed_matches (
  PRIMARY KEY (match_id),
  match_id bigint
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly') THEN
        GRANT SELECT ON matches TO readonly;
        GRANT SELECT ON player_matches TO readonly;
        GRANT SELECT ON heroes TO readonly;
        GRANT SELECT ON leagues TO readonly;
        GRANT SELECT ON items TO readonly;
        GRANT SELECT ON teams TO readonly;
        GRANT SELECT ON team_match TO readonly;
        GRANT SELECT ON match_patch TO readonly;
        GRANT SELECT ON picks_bans TO readonly;
        GRANT SELECT ON match_logs TO readonly;
        GRANT SELECT ON notable_players TO readonly;
        GRANT SELECT ON public_matches TO readonly;
        GRANT SELECT ON public_player_matches TO readonly;
        GRANT SELECT ON players TO readonly;
        GRANT SELECT ON team_rating TO readonly;
    END IF;
END
$$;
