const db = require("../../store/db");

function getHeroesByTeamId(req, res, cb) {
  db.raw(
    `SELECT hero_id, localized_name, count(matches.match_id) games_played, sum(case when (player_matches.player_slot < 128) = matches.radiant_win then 1 else 0 end) wins
      FROM matches
      JOIN team_match USING(match_id)
      JOIN player_matches ON player_matches.match_id = matches.match_id AND team_match.radiant = (player_matches.player_slot < 128)
      JOIN teams USING(team_id)
      LEFT JOIN heroes ON player_matches.hero_id = heroes.id
      WHERE teams.team_id = ?
      GROUP BY hero_id, localized_name
      ORDER BY games_played DESC`,
    [req.params.team_id]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function getMatchesByTeamId(req, res, cb) {
  db.raw(
    `
      SELECT team_match.match_id, radiant_win, radiant_score, dire_score, team_match.radiant, duration, start_time, leagueid, leagues.name as league_name, cluster, tm2.team_id opposing_team_id, teams2.name opposing_team_name, teams2.logo_url opposing_team_logo
      FROM team_match
      JOIN matches USING(match_id)
      JOIN leagues USING(leagueid)
      JOIN team_match tm2 on team_match.match_id = tm2.match_id and team_match.team_id != tm2.team_id
      JOIN teams teams2 on tm2.team_id = teams2.team_id
      WHERE team_match.team_id = ?
      ORDER BY match_id DESC
      `,
    [req.params.team_id]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function getPlayersByTeamId(req, res, cb) {
  db.raw(
    `SELECT account_id, notable_players.name, count(matches.match_id) games_played, sum(case when (player_matches.player_slot < 128) = matches.radiant_win then 1 else 0 end) wins, notable_players.team_id = teams.team_id is_current_team_member
      FROM matches
      JOIN team_match USING(match_id)
      JOIN player_matches ON player_matches.match_id = matches.match_id AND team_match.radiant = (player_matches.player_slot < 128)
      JOIN teams USING (team_id)
      LEFT JOIN notable_players USING(account_id)
      WHERE teams.team_id = ?
      GROUP BY account_id, notable_players.name, notable_players.team_id, teams.team_id
      ORDER BY games_played DESC`,
    [req.params.team_id]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function getTeamsData(req, res, cb) {
  db.raw(
    `SELECT team_rating.*, teams.*
      FROM teams
      LEFT JOIN team_rating using(team_id)
      ORDER BY rating desc NULLS LAST
      LIMIT 1000
      OFFSET ?`,
    [(Number(req.query.page) || 0) * 1000]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows);
  });
}

function getTeamById(req, res, cb) {
  db.raw(
    `SELECT team_rating.*, teams.*
      FROM teams
      LEFT JOIN team_rating using(team_id)
      WHERE teams.team_id = ?`,
    [req.params.team_id]
  ).asCallback((err, result) => {
    if (err) {
      return cb(err);
    }
    return res.json(result.rows[0]);
  });
}

module.exports = {
  getHeroesByTeamId,
  getMatchesByTeamId,
  getPlayersByTeamId,
  getTeamsData,
  getTeamById,
};
