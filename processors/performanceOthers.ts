function greevilsGreed(e, container, meta) {
  if (e.type === 'killed' && 'greevils_greed_stack' in e) {
    const alchName = 'npc_dota_hero_alchemist';
    const alchSlot = meta.hero_to_slot[alchName];
    const alchPlayer = container.players[alchSlot];
    const goldBase = 3;
    let goldStack = e.greevils_greed_stack * 3;
    goldStack = Math.min(goldStack, 18);
    alchPlayer.performance_others = {
      greevils_greed_gold: 0,
      ...alchPlayer.performance_others,
    };
    alchPlayer.performance_others.greevils_greed_gold += goldBase + goldStack;
  }
}
function track(e, container, meta) {
  if (e.tracked_death && e.type === 'killed') {
    const bhName = 'npc_dota_hero_bountyhunter';
    const trackerSlot = meta.hero_to_slot[e.tracked_sourcename];
    const trackerPlayer = container.players[trackerSlot];
    const trackLvl = meta.ability_levels[bhName].bounty_hunter_track;
    const trackTalentLvl =
      meta.ability_levels[bhName].special_bonus_unique_bounty_hunter_9;
    let gold = 0;
    switch (trackLvl) {
      case 1:
        gold = 130;
        break;
      case 2:
        gold = 225;
        break;
      case 3:
        gold = 320;
        break;
      default:
        return;
    }
    // If the talent is selected add the extra bonus
    if (trackTalentLvl === 1) {
      gold += 45;
    }
    trackerPlayer.performance_others = {
      tracked_deaths: 0,
      track_gold: 0,
      ...trackerPlayer.performance_others,
    };
    trackerPlayer.performance_others.tracked_deaths += 1;
    trackerPlayer.performance_others.track_gold += gold;
  }
}
function performanceOthers(e, container, meta) {
  if (!meta) {
    return;
  }
  greevilsGreed(e, container, meta);
  // track(e, container, meta);
}
export default performanceOthers;
