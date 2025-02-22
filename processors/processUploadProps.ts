/**
 * A processor to extract basic match stats from the replay file.
 * This is used for uploaded match parses since we can't get basic match data from the API.
 * */
function processUploadProps(entries) {
  const container = {
    player_map: {},
  };
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    let dota;
    switch (e.type) {
      case 'epilogue':
        dota = JSON.parse(e.key).gameInfo_.dota_;
        container.match_id = dota.matchId_;
        container.game_mode = dota.gameMode_;
        container.radiant_win = dota.gameWinner_ === 2;
        // NOTE: following needs some extraction/transformation
        // container.picks_bans = dota.picksBans_;
        // fs.writeFileSync('./outputEpilogue.json', JSON.stringify(JSON.parse(e.key)));
        break;
      case 'interval':
        if (!container.player_map[e.player_slot]) {
          container.player_map[e.player_slot] = {};
        }
        container.player_map[e.player_slot].hero_id = e.hero_id;
        container.player_map[e.player_slot].level = e.level;
        container.player_map[e.player_slot].kills = e.kills;
        container.player_map[e.player_slot].deaths = e.deaths;
        container.player_map[e.player_slot].assists = e.assists;
        container.player_map[e.player_slot].denies = e.denies;
        container.player_map[e.player_slot].last_hits = e.lh;
        container.player_map[e.player_slot].gold = e.gold;
        container.player_map[e.player_slot].xp = e.xp;
        break;
      default:
        break;
    }
  }
  return container;
}
export default processUploadProps;
