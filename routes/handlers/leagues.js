const db = require("../../store/db");

function getLeagues(req, res, cb) {
  db.select()
    .from("leagues")
    .asCallback((err, result) => {
      if (err) {
        return cb(err);
      }
      return res.json(result);
    });
}

function getLeaguesById(req, res, cb) {
  db.raw(
    `SELECT leagues.*
      FROM leagues
      WHERE leagues.leagueid = ?`,
    [req.params.league_id]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows[0]);
  });
}

function getMatchesByLeagueId(req, res, cb) {
  db.raw(
    `SELECT matches.*
      FROM matches
      WHERE matches.leagueid = ?`,
    [req.params.league_id]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function getTeamsByLeagueId(req, res, cb) {
  db.raw(
    `SELECT team_rating.*, teams.*
      FROM matches
      LEFT JOIN team_match using(match_id)
      LEFT JOIN teams using(team_id)
      LEFT JOIN team_rating using(team_id)
      WHERE matches.leagueid = ?
      GROUP BY (teams.team_id, team_rating.team_id)`,
    [req.params.league_id]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

module.exports = {
  getLeagues,
  getLeaguesById,
  getMatchesByLeagueId,
  getTeamsByLeagueId,
};
