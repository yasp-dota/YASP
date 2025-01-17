/**
 * Associates kill streaks with multi kills and team fights
 * THIS PROCESSOR IS CURRENTLY DEPRECATED AND NOT IN PRODUCTION USE
 * (originally implemented by @nickhh)
 * */
/*
function processMultiKillStreaks(entries, hero_to_slot, parsed_data) {
  const print_multi_kill_streak_debugging = false;
    // bookkeeping about each player
  const players = {};
  const teamfights = parsed_data.teamfights;
    // for each entry in the combat log
  for (var i = 0; i < entries.length; i++) {
    const entry = entries[i];
        // identify the killer
    const killer = entry.unit;
    const killer_index = hero_to_slot[killer];
        // if the killer is a hero (which it might not be)
    if (killer_index !== undefined) {
            // bookmark this player's parsed bookkeeping
      const parsed_info = parsed_data.players[killer_index];
            // if needed, initialize this player's bookkeeping
      if (players[killer_index] === undefined) {
        parsed_info.kill_streaks_log.push([]);
        players[killer_index] = {
          cur_multi_id: 0, // the id of the current multi kill
          cur_multi_val: 0, // the value of the current multi kill
          cur_streak_budget: 2, // the max length of the current kill streak
        };
      }
            // get the number of streaks and the length of the current streak
      let all_streak_length = parsed_info.kill_streaks_log.length;
      let cur_streak_length = parsed_info.kill_streaks_log[all_streak_length - 1].length;
            // bookmark this player's local bookkeeping
      const local_info = players[killer_index];
            // if this entry is a valid kill notification
      if (entry.type === 'killed' && entry.targethero && !entry.targetillusion) {
                // determine who was killed
        const killed = entry.key;
        const killed_index = hero_to_slot[killed];
                // if this is a valid kill (note: self-denies (via bloodstone, etc) are logged
                // as kill events but do not break kill streaks or multi kills events)
        if (killer_index != killed_index) {
                    // check if we've run out of room in the current kills array (note: this
                    // would happen because (for some reason) the combat log does not contain
                    // kill streak events for streaks of size 2 (even though it really should))
          const cur_streak_budget = local_info.cur_streak_budget;
          if (cur_streak_length == cur_streak_budget && cur_streak_budget == 2) {
                        // remove the first element of the streak (note: later we will
                        // push a new second element on to the end of the streak)
            parsed_info.kill_streaks_log[all_streak_length - 1].splice(0, 1);
            cur_streak_length--;
                        // check if the current kill streak has ended
          } else if (cur_streak_length >= cur_streak_budget) {
                        // if so, create a new streak in the kills array
            all_streak_length++;
            cur_streak_length = 0;
            parsed_info.kill_streaks_log.push([]);
            local_info.cur_streak_budget = 2;
            if (print_multi_kill_streak_debugging) {
              console.log('\t%s kill streak has ended', killer);
            }
          }
                    // check if the current multi kill has ended
          if (local_info.cur_multi_val < parsed_info.multi_kill_id_vals[local_info.cur_multi_id]) {
                        // if not, increment the current multi kill value
            local_info.cur_multi_val++;
          } else {
                        // if so, create a new multi kill id and value
            local_info.cur_multi_id++;
            local_info.cur_multi_val = 1;
            parsed_info.multi_kill_id_vals.push(1);
            if (print_multi_kill_streak_debugging) {
              console.log('\t%s multi kill has ended', killer);
            }
          }
                    // determine if this kill was part of a team fight
          let team_fight_id = 0;
          const kill_time = entry.time;
          for (let j = 0; j < teamfights.length; j++) {
            const teamfight = teamfights[j];
            if (kill_time >= teamfight.start && kill_time <= teamfight.end) {
              team_fight_id = j + 1;
            }
          }
                    // add this kill to the killer's list of kills
          parsed_info.kill_streaks_log[all_streak_length - 1].push(
            {
              hero_id: hero_to_id[killed],
              multi_kill_id: local_info.cur_multi_id,
              team_fight_id,
              time: kill_time,
            });
          if (print_multi_kill_streak_debugging) {
            console.log('\t%s killed %s', killer, killed);
          }
        }
                // if this entry is a notification of a multi kill (note: the kill that caused
                // this multi kill has not been seen yet; it will one of the next few entries)
      } else if (entry.type === 'multi_kills') {
                // update the value of the current multi kill
        parsed_info.multi_kill_id_vals[local_info.cur_multi_id] = parseInt(entry.key);
        if (print_multi_kill_streak_debugging) {
          console.log('\t%s got a multi kill of %s', killer, entry.key);
        }
                // if this entry is a notification of a kill streak (note: the kill that caused
                // this kill streak has not been seen yet; it will one of the next few entries)
      } else if (entry.type === 'kill_streaks') {
                // update the value of the current kill streak
        local_info.cur_streak_budget = parseInt(entry.key);
        if (print_multi_kill_streak_debugging) {
          console.log('\t%s got a kill streak of %s', killer, entry.key);
        }
      }
    }
  }
    // remove small (length < 3) kill streaks
  for (const index in players) {
    const data = parsed_data.players[index].kill_streaks_log;
    var i = data.length;
    while (i--) {
      if (data[i].length < 3) {
        data.splice(i, 1);
      }
    }
  }
}
module.exports = processMultiKillStreaks;
*/
