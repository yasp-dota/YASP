const async = require("async");
const constants = require("dotaconstants");
const cacheFunctions = require("../../store/cacheFunctions");
const config = require("../../config");
const db = require("../../store/db");
const queries = require("../../store/queries");
const redis = require("../../store/redis");
const utility = require("../../util/utility");
const playerFields = require("../playerFields.json");
const search = require("../../store/search");
const searchES = require("../../store/searchES");

const { countPeers } = utility;
const { subkeys, countCats } = playerFields;

async function getPlayersByRank(req, res, cb) {
  try {
    const result = await db.raw(
      `
      SELECT account_id, rating, fh_unavailable
      FROM players
      JOIN rank_tier
      USING (account_id)
      ORDER BY rating DESC
      LIMIT 100
      `,
      []
    );
    return res.json(result.rows);
  } catch (err) {
    return cb(err);
  }
}

function getPlayersByAccountId(req, res, cb) {
  const accountId = Number(req.params.account_id);
  async.parallel(
    {
      profile(cb) {
        queries.getPlayer(db, accountId, (err, playerData) => {
          if (playerData !== null && playerData !== undefined) {
            playerData.is_contributor = utility.isContributor(accountId);
            playerData.is_subscriber = Boolean(playerData?.status);
          }
          cb(err, playerData);
        });
      },
      solo_competitive_rank(cb) {
        db.first()
          .from("solo_competitive_rank")
          .where({ account_id: accountId })
          .asCallback((err, row) => {
            cb(err, row ? row.rating : null);
          });
      },
      competitive_rank(cb) {
        db.first()
          .from("competitive_rank")
          .where({ account_id: accountId })
          .asCallback((err, row) => {
            cb(err, row ? row.rating : null);
          });
      },
      rank_tier(cb) {
        db.first()
          .from("rank_tier")
          .where({ account_id: accountId })
          .asCallback((err, row) => {
            cb(err, row ? row.rating : null);
          });
      },
      leaderboard_rank(cb) {
        db.first()
          .from("leaderboard_rank")
          .where({ account_id: accountId })
          .asCallback((err, row) => {
            cb(err, row ? row.rating : null);
          });
      },
      mmr_estimate(cb) {
        queries.getMmrEstimate(accountId, (err, est) => cb(err, est || {}));
      },
    },
    (err, result) => {
      if (err) {
        return cb(err);
      }
      return res.json(result);
    }
  );
}

function getPlayersByAccountIdWl(req, res, cb) {
  const result = {
    win: 0,
    lose: 0,
  };
  req.queryObj.project = req.queryObj.project.concat("player_slot", "radiant_win");
  queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
    if (err) {
      return cb(err);
    }
    cache.forEach((m) => {
      if (utility.isRadiant(m) === m.radiant_win) {
        result.win += 1;
      } else {
        result.lose += 1;
      }
    });
    return cacheFunctions.sendDataWithCache(req, res, result, "wl");
  });
}

function getPlayersByAccountIdRecentMatches(req, res, cb) {
  queries.getPlayerMatches(
    req.params.account_id,
    {
      project: req.queryObj.project.concat([
        "hero_id",
        "start_time",
        "duration",
        "player_slot",
        "radiant_win",
        "game_mode",
        "lobby_type",
        "version",
        "kills",
        "deaths",
        "assists",
        "skill",
        "average_rank",
        "xp_per_min",
        "gold_per_min",
        "hero_damage",
        "tower_damage",
        "hero_healing",
        "last_hits",
        "lane",
        "lane_role",
        "is_roaming",
        "cluster",
        "leaver_status",
        "party_size",
      ]),
      dbLimit: 20,
    },
    (err, cache) => {
      if (err) {
        return cb(err);
      }
      return res.json(cache.filter((match) => match.duration));
    }
  );
}

function getPlayersByAccountIdMatches(req, res, cb) {
  // Use passed fields as additional fields, if available
  const additionalFields = req.query.project || [
    "hero_id",
    "start_time",
    "duration",
    "player_slot",
    "radiant_win",
    "game_mode",
    "lobby_type",
    "version",
    "kills",
    "deaths",
    "assists",
    "skill",
    "average_rank",
    "leaver_status",
    "party_size",
  ];
  req.queryObj.project = req.queryObj.project.concat(additionalFields);
  queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
    if (err) {
      return cb(err);
    }
    return res.json(cache);
  });
}

function getPlayersByAccountIdHeroes(req, res, cb) {
  const heroes = {};
  // prefill heroes with every hero
  Object.keys(constants.heroes).forEach((heroId) => {
    const heroIdInt = parseInt(heroId, 10);
    const hero = {
      hero_id: heroIdInt,
      last_played: 0,
      games: 0,
      win: 0,
      with_games: 0,
      with_win: 0,
      against_games: 0,
      against_win: 0,
    };
    heroes[heroIdInt] = hero;
  });
  req.queryObj.project = req.queryObj.project.concat("heroes", "account_id", "start_time", "player_slot", "radiant_win");
  queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
    if (err) {
      return cb(err);
    }
    cache.forEach((m) => {
      const { isRadiant } = utility;
      const playerWin = isRadiant(m) === m.radiant_win;
      const group = m.heroes || {};
      Object.keys(group).forEach((key) => {
        const tm = group[key];
        const tmHero = tm.hero_id;
        // don't count invalid heroes
        if (tmHero in heroes) {
          if (isRadiant(tm) === isRadiant(m)) {
            if (tm.account_id === m.account_id) {
              heroes[tmHero].games += 1;
              heroes[tmHero].win += playerWin ? 1 : 0;
              if (m.start_time > heroes[tmHero].last_played) {
                heroes[tmHero].last_played = m.start_time;
              }
            } else {
              heroes[tmHero].with_games += 1;
              heroes[tmHero].with_win += playerWin ? 1 : 0;
            }
          } else {
            heroes[tmHero].against_games += 1;
            heroes[tmHero].against_win += playerWin ? 1 : 0;
          }
        }
      });
    });
    const result = Object.keys(heroes)
      .map((k) => heroes[k])
      .filter((hero) => !req.queryObj.having || hero.games >= Number(req.queryObj.having))
      .sort((a, b) => b.games - a.games);
    return cacheFunctions.sendDataWithCache(req, res, result, "heroes");
  });
}

function getPlayersByAccountIdPeers(req, res, cb) {
  req.queryObj.project = req.queryObj.project.concat("heroes", "start_time", "player_slot", "radiant_win", "gold_per_min", "xp_per_min");
  queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
    if (err) {
      return cb(err);
    }
    const teammates = utility.countPeers(cache);
    return queries.getPeers(
      db,
      teammates,
      {
        account_id: req.params.account_id,
      },
      (err, result) => {
        if (err) {
          return cb(err);
        }
        return cacheFunctions.sendDataWithCache(req, res, result, "peers");
      }
    );
  });
}

function getPlayersByAccountIdPros(req, res, cb) {
  req.queryObj.project = req.queryObj.project.concat("heroes", "start_time", "player_slot", "radiant_win");
  queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
    if (err) {
      return cb(err);
    }
    const teammates = countPeers(cache);
    return queries.getProPeers(
      db,
      teammates,
      {
        account_id: req.params.account_id,
      },
      (err, result) => {
        if (err) {
          return cb(err);
        }
        return res.json(result);
      }
    );
  });
}

function getPlayersByAccountIdTotals(req, res, cb) {
  const result = {};
  Object.keys(subkeys).forEach((key) => {
    result[key] = {
      field: key,
      n: 0,
      sum: 0,
    };
  });
  req.queryObj.project = req.queryObj.project.concat(Object.keys(subkeys));
  queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
    if (err) {
      return cb(err);
    }
    cache.forEach((m) => {
      Object.keys(subkeys).forEach((key) => {
        if (m[key] !== null && m[key] !== undefined) {
          result[key].n += 1;
          result[key].sum += Number(m[key]);
        }
      });
    });
    return res.json(Object.keys(result).map((key) => result[key]));
  });
}

function getPlayersByAccountIdCounts(req, res, cb) {
  const result = {};
  Object.keys(countCats).forEach((key) => {
    result[key] = {};
  });
  req.queryObj.project = req.queryObj.project.concat(Object.keys(countCats));
  queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
    if (err) {
      return cb(err);
    }
    cache.forEach((m) => {
      m.is_radiant = utility.isRadiant(m);
      Object.keys(countCats).forEach((key) => {
        if (!result[key][Math.floor(m[key])]) {
          result[key][Math.floor(m[key])] = {
            games: 0,
            win: 0,
          };
        }
        result[key][Math.floor(m[key])].games += 1;
        const won = Number(m.radiant_win === utility.isRadiant(m));
        result[key][Math.floor(m[key])].win += won;
      });
    });
    return res.json(result);
  });
}

function getPlayersByAccountIdHistogramsByField(req, res, cb) {
  const { field } = req.params;
  req.queryObj.project = req.queryObj.project.concat("radiant_win", "player_slot").concat([field].filter((f) => subkeys[f]));
  queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
    if (err) {
      return cb(err);
    }
    const buckets = 40;
    // Find the maximum value to determine how large each bucket should be
    const max = Math.max(...cache.map((m) => m[field]));
    // Round the bucket size up to the nearest integer
    const bucketSize = Math.ceil((max + 1) / buckets);
    const bucketArray = Array.from(
      {
        length: buckets,
      },
      (value, index) => ({
        x: bucketSize * index,
        games: 0,
        win: 0,
      })
    );
    cache.forEach((m) => {
      if (m[field] || m[field] === 0) {
        const index = Math.floor(m[field] / bucketSize);
        if (bucketArray[index]) {
          bucketArray[index].games += 1;
          bucketArray[index].win += utility.isRadiant(m) === m.radiant_win ? 1 : 0;
        }
      }
    });
    return res.json(bucketArray);
  });
}

function getPlayersByAccountIdWardMap(req, res, cb) {
  const result = {
    obs: {},
    sen: {},
  };
  req.queryObj.project = req.queryObj.project.concat(Object.keys(result));
  queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
    if (err) {
      return cb(err);
    }
    cache.forEach((m) => {
      Object.keys(result).forEach((key) => {
        utility.mergeObjects(result[key], m[key]);
      });
    });
    return res.json(result);
  });
}

function getPlayersByAccountIdWordCloud(req, res, cb) {
  const result = {
    my_word_counts: {},
    all_word_counts: {},
  };
  req.queryObj.project = req.queryObj.project.concat(Object.keys(result));
  queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
    if (err) {
      return cb(err);
    }
    cache.forEach((m) => {
      Object.keys(result).forEach((key) => {
        utility.mergeObjects(result[key], m[key]);
      });
    });
    return res.json(result);
  });
}

function getPlayersByAccountIdRatings(req, res, cb) {
  queries.getPlayerRatings(db, req.params.account_id, (err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result);
  });
}

function getPlayersByAccountIdRankings(req, res, cb) {
  queries.getPlayerHeroRankings(req.params.account_id, (err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result);
  });
}

function getPlayersByAccountIdRefresh(req, res, cb) {
  redis.rpush(
    "fhQueue",
    JSON.stringify({
      account_id: req.params.account_id || "1",
    }),
    (err, length) => {
      if (err) {
        return cb(err);
      }
      return res.json({
        length,
      });
    }
  );
}

function getProPlayers(req, res, cb) {
  db.select()
    .from("players")
    .rightJoin("notable_players", "players.account_id", "notable_players.account_id")
    .orderBy("notable_players.account_id", "asc")
    .asCallback((err, result) => {
      if (err) {
        return cb(err);
      }
      return res.json(result);
    });
}

function searchPlayers(req, res, cb) {
  if (!req.query.q) {
    return res.status(400).json([]);
  }

  if (req.query.es || utility.checkIfInExperiment(res.locals.ip, config.ES_SEARCH_PERCENT)) {
    return searchES(req.query, (err, result) => {
      if (err) {
        return cb(err);
      }
      return res.json(result);
    });
  }
  return search(req.query, (err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result);
  });
}

module.exports = {
  getPlayersByRank,
  getPlayersByAccountId,
  getPlayersByAccountIdWl,
  getPlayersByAccountIdRecentMatches,
  getPlayersByAccountIdMatches,
  getPlayersByAccountIdHeroes,
  getPlayersByAccountIdPeers,
  getPlayersByAccountIdPros,
  getPlayersByAccountIdTotals,
  getPlayersByAccountIdCounts,
  getPlayersByAccountIdHistogramsByField,
  getPlayersByAccountIdWardMap,
  getPlayersByAccountIdWordCloud,
  getPlayersByAccountIdRatings,
  getPlayersByAccountIdRankings,
  getPlayersByAccountIdRefresh,
  getProPlayers,
  searchPlayers,
};
