/**
 * Compute data requiring all players in a match for storage in match table
 * */
function processAllPlayers(entries, meta) {
  const goldAdvTime = {};
  const xpAdvTime = {};
  const res = {
    radiant_gold_adv: [],
    radiant_xp_adv: [],
  };
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    if (e.time >= 0 && e.time % 60 === 0 && e.type === 'interval') {
      const g = isRadiant({
        player_slot: meta.slot_to_playerslot[e.slot],
      })
        ? e.gold
        : -e.gold;
      const x = isRadiant({
        player_slot: meta.slot_to_playerslot[e.slot],
      })
        ? e.xp
        : -e.xp;
      goldAdvTime[e.time] = goldAdvTime[e.time] ? goldAdvTime[e.time] + g : g;
      xpAdvTime[e.time] = xpAdvTime[e.time] ? xpAdvTime[e.time] + x : x;
    }
  }
  const order = Object.keys(goldAdvTime).sort((a, b) => Number(a) - Number(b));
  order.forEach((k) => {
    res.radiant_gold_adv.push(goldAdvTime[k]);
    res.radiant_xp_adv.push(xpAdvTime[k]);
  });
  return res;
}

function isRadiant(player) {
  return player.player_slot < 128;
}

export default processAllPlayers;
