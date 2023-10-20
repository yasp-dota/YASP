const constants = require("dotaconstants");
const { Client } = require("pg");
const buildStatus = require("../../store/buildStatus");
const config = require("../../config");
const db = require("../../store/db");
const queries = require("../../store/queries");
const queue = require("../../store/queue");
const redis = require("../../store/redis");
const utility = require("../../util/utility");

async function explorer(req, res) {
  // TODO handle NQL (@nicholashh query language)
  const input = req.query.sql;
  const client = new Client({
    connectionString: config.READONLY_POSTGRES_URL,
    statement_timeout: 10000,
  });
  client.connect();
  let result = null;
  let err = null;
  try {
    result = await client.query(input);
  } catch (e) {
    err = e;
  }
  client.end();
  const final = { ...result, err: err && err.toString() };
  return res.status(err ? 400 : 200).json(final);
}

function getBuildStatus(req, res, cb) {
  buildStatus(db, redis, (err, status) => {
    if (err) {
      return cb(err);
    }
    return res.json(status);
  });
}

function getConstants(req, res) {
  return res.json(Object.keys(constants));
}

function getConstantsByResource(req, res, cb) {
  const { resource } = req.params;
  if (resource in constants) {
    return res.json(constants[resource]);
  }
  return cb();
}

function getHealth(req, res, cb) {
  redis.hgetall("health", (err, result) => {
    if (err) {
      return cb(err);
    }
    const response = result || {};
    Object.keys(response).forEach((key) => {
      response[key] = JSON.parse(response[key]);
    });
    if (!req.params.metric) {
      return res.json(response);
    }
    const single = response[req.params.metric];
    const healthy = single.metric < single.threshold;
    return res.status(healthy ? 200 : 500).json(single);
  });
}

function getItemTimings(req, res, cb) {
  queries.getItemTimings(req, (err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function getLaneRoles(req, res, cb) {
  queries.getLaneRoles(req, (err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function getMetadata(req, res, cb) {
  queries.getMetadata(req, (err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result);
  });
}

function getMmrDistributions(req, res, cb) {
  queries.getDistributions(redis, (err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result);
  });
}

function getRecordsByField(req, res, cb) {
  redis.zrevrange(`records:${req.params.field}`, 0, 99, "WITHSCORES", (err, rows) => {
    if (err) {
      return cb(err);
    }
    const entries = rows
      .map((r, i) => {
        const matchId = parseInt(r.split(":")[0], 10);
        const startTime = parseInt(r.split(":")[1], 10);
        const heroId = parseInt(r.split(":")[2], 10);
        const score = parseInt(rows[i + 1], 10);

        return {
          match_id: Number.isNaN(matchId) ? null : matchId,
          start_time: Number.isNaN(startTime) ? null : startTime,
          hero_id: Number.isNaN(heroId) ? null : heroId,
          score: Number.isNaN(score) ? null : score,
        };
      })
      .filter((r, i) => i % 2 === 0);
    return res.json(entries);
  });
}

function getReplayData(req, res, cb) {
  db.select(["match_id", "cluster", "replay_salt"])
    .from("match_gcdata")
    .whereIn("match_id", [].concat(req.query.match_id || []).slice(0, 5))
    .asCallback((err, result) => {
      if (err) {
        return cb(err);
      }
      return res.json(result);
    });
}

function getRequestState(req, res, cb) {
  queue.getJob(req.params.jobId, (err, job) => {
    if (err) {
      return cb(err);
    }
    if (job) {
      return res.json({ ...job, jobId: job.id });
    }
    return res.json(null);
  });
}

function getSchema(req, res, cb) {
  db.select(["table_name", "column_name", "data_type"])
    .from("information_schema.columns")
    .where({
      table_schema: "public",
    })
    .asCallback((err, result) => {
      if (err) {
        return cb(err);
      }
      return res.json(result);
    });
}

function getTeamScenarios(req, res, cb) {
  queries.getTeamScenarios(req, (err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function requestParse(req, res) {
  const matchId = req.params.match_id;
  const match = {
    match_id: Number(matchId),
  };
  function exitWithJob(err, parseJob) {
    if (err) {
      console.error(err);
    }
    res.status(err ? 400 : 200).json({
      job: {
        jobId: parseJob && parseJob.id,
      },
    });
  }
  if (match && match.match_id) {
    // match id request, get data from API
    return utility.getData(utility.generateJob("api_details", match).url, (err, body) => {
      if (err) {
        // couldn't get data from api, non-retryable
        return exitWithJob(JSON.stringify(err));
      }
      // Count this request
      utility.redisCount(redis, "request");
      // match details response
      const match = body.result;
      return queries.insertMatch(
        match,
        {
          type: "api",
          attempts: 1,
          priority: 1,
          forceParse: true,
        },
        exitWithJob
      );
    });
  }
  return exitWithJob("invalid input");
}

module.exports = {
  explorer,
  getBuildStatus,
  getConstants,
  getConstantsByResource,
  getHealth,
  getItemTimings,
  getLaneRoles,
  getMetadata,
  getMmrDistributions,
  getRecordsByField,
  getReplayData,
  getRequestState,
  getSchema,
  getTeamScenarios,
  requestParse,
};
