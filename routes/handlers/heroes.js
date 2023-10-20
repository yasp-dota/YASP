const moment = require("moment");
const db = require("../../store/db");
const queries = require("../../store/queries");
const redis = require("../../store/redis");

function getHeroBenchmarks(req, res, cb) {
  queries.getHeroBenchmarks(
    db,
    redis,
    {
      hero_id: req.query.hero_id,
    },
    (err, result) => {
      if (err) {
        return cb(err);
      }
      return res.json(result);
    }
  );
}

function getHeroData(req, res, cb) {
  db.select()
    .from("heroes")
    .orderBy("id", "asc")
    .asCallback((err, result) => {
      if (err) {
        return cb(err);
      }
      return res.json(result);
    });
}

function getHeroRankings(req, res, cb) {
  queries.getHeroRankings(db, redis, req.query.hero_id, {}, (err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result);
  });
}

function getHeroStats(req, res, cb) {
  // fetch from cached redis value
  redis.get("heroStats", (err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(JSON.parse(result));
  });
}

function getItemPopularityByHeroId(req, res, cb) {
  const heroId = req.params.hero_id;
  queries.getHeroItemPopularity(db, redis, heroId, {}, (err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result);
  });
}

function getMatchDurationsByHeroId(req, res, cb) {
  const heroId = req.params.hero_id;
  db.raw(
    `SELECT
    (matches.duration / 300 * 300) duration_bin,
    count(match_id) games_played,
    sum(case when (player_matches.player_slot < 128) = matches.radiant_win then 1 else 0 end) wins
    FROM matches
    JOIN player_matches using(match_id)
    WHERE player_matches.hero_id = ?
    GROUP BY (matches.duration / 300 * 300)`,
    [heroId]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function getMatchupsByHeroId(req, res, cb) {
  const heroId = req.params.hero_id;
  db.raw(
    `SELECT
    pm2.hero_id,
    count(player_matches.match_id) games_played,
    sum(case when (player_matches.player_slot < 128) = matches.radiant_win then 1 else 0 end) wins
    FROM matches
    JOIN player_matches using(match_id)
    JOIN player_matches pm2 on player_matches.match_id = pm2.match_id AND (player_matches.player_slot < 128) != (pm2.player_slot < 128)
    WHERE player_matches.hero_id = ?
    AND matches.start_time > ?
    GROUP BY pm2.hero_id
    ORDER BY games_played DESC`,
    [heroId, moment().subtract(1, "year").format("X")]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function getPlayersByHeroId(req, res, cb) {
  const heroId = req.params.hero_id;
  db.raw(
    `SELECT
    account_id,
    count(match_id) games_played,
    sum(case when (player_matches.player_slot < 128) = matches.radiant_win then 1 else 0 end) wins
    FROM matches
    JOIN player_matches using(match_id)
    WHERE player_matches.hero_id = ?
    GROUP BY account_id
    ORDER BY games_played DESC`,
    [heroId]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function getRecentMatchesByHeroId(req, res, cb) {
  const heroId = req.params.hero_id;
  db.raw(
    `SELECT
    matches.match_id,
    matches.start_time,
    matches.duration,
    matches.radiant_win,
    matches.leagueid,
    leagues.name as league_name,
    ((player_matches.player_slot < 128) = matches.radiant_win) radiant,
    player_matches.player_slot,
    player_matches.account_id,
    player_matches.kills,
    player_matches.deaths,
    player_matches.assists
    FROM matches
    JOIN player_matches using(match_id)
    JOIN leagues using(leagueid)
    LEFT JOIN heroes on heroes.id = player_matches.hero_id
    WHERE player_matches.hero_id = ?
    ORDER BY matches.match_id DESC
    LIMIT 100`,
    [heroId]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

module.exports = {
  getHeroBenchmarks,
  getHeroRankings,
  getHeroData,
  getHeroStats,
  getItemPopularityByHeroId,
  getMatchDurationsByHeroId,
  getMatchupsByHeroId,
  getPlayersByHeroId,
  getRecentMatchesByHeroId,
};
