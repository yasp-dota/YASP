const buildMatch = require("../../store/buildMatch");
const db = require("../../store/db");
const redis = require("../../store/redis");
const utility = require("../../util/utility");

async function getMatchById(req, res, cb) {
  try {
    const match = await buildMatch(req.params.match_id, req.query);
    if (!match) {
      return cb();
    }
    return res.json(match);
  } catch (err) {
    return cb(err);
  }
}

function getProMatches(req, res, cb) {
  db.raw(
    `
  SELECT match_id, duration, start_time,
  radiant_team_id, radiant.name as radiant_name,
  dire_team_id, dire.name as dire_name,
  leagueid, leagues.name as league_name,
  series_id, series_type,
  radiant_score, dire_score,
  radiant_win
  FROM matches
  LEFT JOIN teams radiant
  ON radiant.team_id = matches.radiant_team_id
  LEFT JOIN teams dire
  ON dire.team_id = matches.dire_team_id
  LEFT JOIN leagues USING(leagueid)
  WHERE match_id < ?
  ORDER BY match_id DESC
  LIMIT 100
  `,
    [req.query.less_than_match_id || Number.MAX_SAFE_INTEGER]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

async function getPublicMatches(req, res, cb) {
  const currMax = (await db("public_matches").max("match_id").first()).max || 0;
  const lessThan = Number(req.query.less_than_match_id) || currMax;
  let moreThan = lessThan - 1000000;
  let order = "";
  if (req.query.mmr_ascending) {
    order = "ORDER BY avg_rank_tier ASC NULLS LAST";
  } else if (req.query.mmr_descending) {
    order = "ORDER BY avg_rank_tier DESC NULLS LAST";
  } else {
    order = "ORDER BY match_id DESC";
    moreThan = 0;
  }
  const minRank = req.query.min_rank ? `AND avg_rank_tier >= ${req.query.min_rank}` : "";
  const maxRank = req.query.max_rank ? `AND avg_rank_tier <= ${req.query.max_rank}` : "";

  db.raw(
    `
  WITH match_ids AS (SELECT match_id FROM public_matches
  WHERE TRUE
  AND match_id > ?
  AND match_id < ?
  ${minRank}
  ${maxRank}
  ${order}
  LIMIT 100)
  SELECT * FROM
  (SELECT * FROM public_matches
  WHERE match_id IN (SELECT match_id FROM match_ids)) matches
  JOIN
  (SELECT match_id, string_agg(hero_id::text, ',') radiant_team FROM public_player_matches WHERE match_id IN (SELECT match_id FROM match_ids) AND player_slot <= 127 GROUP BY match_id) radiant_team
  USING(match_id)
  JOIN
  (SELECT match_id, string_agg(hero_id::text, ',') dire_team FROM public_player_matches WHERE match_id IN (SELECT match_id FROM match_ids) AND player_slot > 127 GROUP BY match_id) dire_team
  USING(match_id)
  ${order}
  `,
    [moreThan, lessThan]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function getParsedMatches(req, res, cb) {
  const lessThan = req.query.less_than_match_id || Number.MAX_SAFE_INTEGER;

  db.raw(
    `
  SELECT * FROM parsed_matches
  WHERE match_id < ?
  ORDER BY match_id DESC
  LIMIT 100
  `,
    [lessThan]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function findMatches(req, res, cb) {
  // accept as input two arrays of up to 5
  const t0 = [].concat(req.query.teamA || []).slice(0, 5);
  const t1 = [].concat(req.query.teamB || []).slice(0, 5);

  // Construct key for redis
  const key = `combos:${utility.matchupToString(t0, t1, true)}`;
  redis.get(key, (err, reply) => {
    if (err) {
      return cb(err);
    }
    if (reply) {
      return res.end(reply);
    }
    // Determine which comes first
    // const rcg = groupToString(t0);
    // const dcg = groupToString(t1);

    // const inverted = rcg > dcg;
    const inverted = false;
    const teamA = inverted ? t1 : t0;
    const teamB = inverted ? t0 : t1;

    return db
      .raw("select * from hero_search where (teamA @> ? AND teamB @> ?) OR (teamA @> ? AND teamB @> ?) order by match_id desc limit 10", [teamA, teamB, teamB, teamA])
      .asCallback((err, result) => {
        if (err) {
          return cb(err);
        }
        redis.setex(key, 60, JSON.stringify(result.rows));
        return res.json(result.rows);
      });
  });
}

function getLiveMatches(req, res, cb) {
  redis.zrangebyscore("liveGames", "-inf", "inf", (err, rows) => {
    if (err) {
      return cb(err);
    }
    if (!rows.length) {
      return res.json(rows);
    }
    const keys = rows.map((r) => `liveGame:${r}`);
    return redis.mget(keys, (err, rows) => {
      if (err) {
        return cb(err);
      }
      return res.json(rows.map((r) => JSON.parse(r)));
    });
  });
}

module.exports = {
  getMatchById,
  getProMatches,
  getPublicMatches,
  getParsedMatches,
  findMatches,
  getLiveMatches,
};
