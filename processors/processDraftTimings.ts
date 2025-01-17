/**
 * This processor grabs the draft timings from the parsed replay.
 * This is ideally to be used only for captain modes formats.
 * The output is:
 * order: the order of the pick or ban (1-20) (10 bans and 10 picks)
 * pick: whether the draft stage was a pick or ban. pick == true, ban == false
 * active_team: the active team during the draft stage (2 or 3) if 0
 * then not captains mode. Added check to ignore no CM games.
 * hero_id: the id of the hero banned or picked in the draft stage
 * player_slot: null for bans, the player_slot assoicated with the hero_id
 * time: removed for total time taken
 * extra_time: how much of the extra time is left at the end of the draft stage
 * total_time_taken: the time taken for the draft stage
 */
function processDraftTimings(entries, meta) {
  const draftTimings = [];
  const heroIdToSlot = meta.hero_id_to_slot;
  let sumActiveTeam = 0;
  let previousActiveTeam = 0;
  let draftStart = 0;
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    const heroId = e.hero_id;
    if (e.type === 'draft_timings') {
      // The active team needs to be downshifted by 1, so ignore the final observation.
      if (i < entries.length - 1) {
        sumActiveTeam += e.draft_active_team;
      }
      const currpickban = {
        order: e.draft_order,
        pick: e.pick,
        active_team: previousActiveTeam,
        hero_id: e.hero_id,
        player_slot: e.pick === true ? heroIdToSlot[heroId] : null,
        time: e.time,
        extra_time:
          e.draft_active_team === 2 ? e.draft_extime0 : e.draft_extime1,
        total_time_taken: 0,
      };
      draftTimings.push(JSON.parse(JSON.stringify(currpickban)));
      previousActiveTeam = e.draft_active_team;
    } else if (e.type === 'draft_start') {
      draftStart = e.time;
    }
  }
  // ignore Source 1 games
  if (draftTimings.length !== 0) {
    // update the team that had the first pick/ban
    draftTimings[0].active_team = (sumActiveTeam % 2) + 2;
    for (let j = 0; j < draftTimings.length; j += 1) {
      if (draftTimings[j].order === 1) {
        draftTimings[j].total_time_taken = draftTimings[j].time - draftStart;
      } else {
        let index2;
        // find the time of the end of the previous order
        for (let i = 0; i < draftTimings.length; i += 1) {
          const currpick = draftTimings[i];
          if (currpick.order === draftTimings[j].order - 1) {
            index2 = i;
          }
        }
        // calculate the timings
        draftTimings[j].total_time_taken =
          draftTimings[j].time - draftTimings[index2].time;
      }
    }
  }
  // remove the time, no need for it
  for (let i = 0; i < draftTimings.length; i += 1) {
    delete draftTimings[i].time;
  }
  return draftTimings;
}
export default processDraftTimings;
