/**
 * Strips off "item_" from strings, and nullifies dota_unknown.
 * Does not mutate the original string.
 * */
function translate(input) {
  if (input === 'dota_unknown') {
    return null;
  }
  if (input && input.indexOf('item_') === 0) {
    return input.slice(5);
  }
  return input;
}
/**
 * Prepends illusion_ to string if illusion
 * */
function computeIllusionString(input, isIllusion) {
  return (isIllusion ? 'illusion_' : '') + input;
}

/**
 * Produces a new output array with expanded entries from the original input array
 * */
function processExpand(entries, meta) {
  const output = [];
  /**
   * Place a copy of the entry in the output
   * */
  function expand(e) {
    // set slot and player_slot
    const slot = ('slot' in e) ? e.slot : meta.hero_to_slot[e.unit];
    output.push(Object.assign({}, e, {
      slot,
      player_slot: meta.slot_to_playerslot[slot],
    }));
  }

  // Tracks current aegis holder so we can ignore kills that pop aegis
  let aegisHolder = null;

  // Used to ignore meepo clones killing themselves
  let aegisDeathTime = null;

  const types = {
    DOTA_COMBATLOG_DAMAGE(e) {
      // damage
      const unit = e.sourcename;
      const key = computeIllusionString(e.targetname, e.targetillusion);
      const inflictor = translate(e.inflictor);
      expand(Object.assign({}, e, {
        unit,
        key,
        type: 'damage',
      }));
      // check if this damage happened to a real hero
      if (e.targethero && !e.targetillusion) {
        // reverse
        expand({
          time: e.time,
          value: e.value,
          unit: key,
          key: unit,
          type: 'damage_taken',
        });
        expand({
          value: e.value,
          unit,
          key: [inflictor, translate(e.targetname)],
          type: 'damage_targets',
        });
        // count a hit on a real hero with this inflictor
        expand({
          time: e.time,
          value: 1,
          unit,
          key: inflictor,
          type: 'hero_hits',
        });
        // don't count self-damage for the following
        if (key !== unit) {
          // count damage dealt to a real hero with this inflictor
          expand({
            time: e.time,
            value: e.value,
            unit,
            key: inflictor,
            type: 'damage_inflictor',
          });
          // biggest hit on a hero
          expand({
            type: 'max_hero_hit',
            time: e.time,
            max: true,
            inflictor,
            unit,
            key,
            value: e.value,
          });
          if (e.sourcename && e.sourcename.includes('npc_dota_hero_')) {
            expand({
              time: e.time,
              value: e.value,
              type: 'damage_inflictor_received',
              unit: key,
              key: inflictor,
            });
          }
        }
      }
    },
    DOTA_COMBATLOG_HEAL(e) {
      // healing
      expand(Object.assign(e, {}, {
        unit: e.sourcename,
        key: computeIllusionString(e.targetname, e.targetillusion),
        type: 'healing',
      }));
    },
    DOTA_COMBATLOG_MODIFIER_ADD(e) {
      // gain buff/debuff
      // e.attackername // unit that buffed (use source to get the hero? chen/enchantress)
      // e.inflictor // the buff
      // e.targetname // target of buff (possibly illusion)

      // Aegis expired
      if (e.inflictor === 'modifier_aegis_regen') {
        aegisHolder = null;
      }
    },
    DOTA_COMBATLOG_MODIFIER_REMOVE() {
      // modifier_lost
      // lose buff/debuff
      // this is really only useful if we want to try to "time" modifiers
      // e.targetname is unit losing buff (possibly illusion)
      // e.inflictor is name of buff
    },
    DOTA_COMBATLOG_DEATH(e) {
      const unit = e.sourcename;
      const key = computeIllusionString(e.targetname, e.targetillusion);

      // If it is a building kill
      if (e.targetname.indexOf('_tower') > -1
          || e.targetname.indexOf('_rax_') > -1
          || e.targetname.indexOf('_healers') > -1
          || e.targetname.indexOf('_fort') > -1) {
        expand({
          time: e.time,
          type: 'building_kill',
          unit,
          key,
        });
      }

      if (meta.hero_to_slot[key] === aegisHolder) {
        // The aegis holder was killed
        if (aegisDeathTime === null) {
          // It is the first time they have been killed this tick
          // If the hero is meepo than the clones will also get killed
          aegisDeathTime = e.time;
          return;
        } if (aegisDeathTime !== e.time) {
          // We are after the aegis death tick, so clear everything
          aegisDeathTime = null;
          aegisHolder = null;
        } else {
          // We are on the same tick, so it is a clone dying
          return;
        }
      }

      // Ignore suicides
      if (e.attackername === key) {
        return;
      }

      // If a hero was killed log extra information
      if (e.targethero && !e.targetillusion) {
        expand({
          time: e.time,
          unit,
          key,
          tracked_death: e.tracked_death,
          tracked_sourcename: e.tracked_sourcename,
          type: 'kills_log',
        });
        // reverse
        expand({
          time: e.time,
          unit: key,
          key: unit,
          type: 'killed_by',
        });
      }

      expand(Object.assign({}, e, {
        unit,
        key,
        type: 'killed',
        // Dota Plus patch added a value field to this event type, but we want to always treat it as 1
        value: 1,
      }));
    },
    DOTA_COMBATLOG_ABILITY(e) {
      // Value field is 1 or 2 for toggles
      // ability use
      expand({
        time: e.time,
        unit: e.attackername,
        key: translate(e.inflictor),
        type: 'ability_uses',
      });
      // target of ability
      if (e.targethero && !e.targetillusion) {
        expand({
          time: e.time,
          unit: e.attackername,
          key: [translate(e.inflictor), translate(e.targetname)],
          type: 'ability_targets',
        });
      }
    },
    DOTA_COMBATLOG_ITEM(e) {
      // item use
      expand({
        time: e.time,
        unit: e.attackername,
        key: translate(e.inflictor),
        type: 'item_uses',
      });
    },
    DOTA_COMBATLOG_LOCATION() {
      // not in replay?
    },
    DOTA_COMBATLOG_GOLD(e) {
      // gold gain/loss
      expand({
        time: e.time,
        value: e.value,
        unit: e.targetname,
        key: e.gold_reason,
        type: 'gold_reasons',
      });
    },
    DOTA_COMBATLOG_GAME_STATE() {
      // state
    },
    DOTA_COMBATLOG_XP(e) {
      // xp gain
      expand({
        time: e.time,
        value: e.value,
        unit: e.targetname,
        key: e.xp_reason,
        type: 'xp_reasons',
      });
    },
    STARTING_ITEM(e) {
      // starting items
      const unit = e.targetname;
      const key = translate(e.valuename);
      expand({
        time: e.time,
        value: 1,
        unit,
        key,
        charges: e.charges,
        itemslot: e.itemslot,
        type: 'starting_items',
      });
    },
    DOTA_COMBATLOG_PURCHASE(e) {
      // purchase
      const unit = e.targetname;
      const key = translate(e.valuename);
      expand({
        time: e.time,
        value: 1,
        unit,
        key,
        type: 'purchase',
      });
      // don't include recipes in purchase logs
      if (key.indexOf('recipe_') !== 0) {
        expand({
          time: e.time,
          value: 1,
          unit,
          key,
          type: 'purchase_log',
        });
      }
    },
    DOTA_COMBATLOG_BUYBACK(e) {
      // buyback
      expand({
        time: e.time,
        slot: e.value,
        type: 'buyback_log',
      });
    },
    DOTA_COMBATLOG_ABILITY_TRIGGER() {
      // ability_trigger
      // only seems to happen for axe spins
      // e.attackername //unit triggered on?
      // e.inflictor; //ability triggered?
      // e.targetname //unit that triggered the skill
    },
    DOTA_COMBATLOG_PLAYERSTATS() {
      // player_stats
      // Don't really know what this does, following fields seem to be populated
      // attackername
      // targetname
      // targetsourcename
      // value (1-15)
    },
    DOTA_COMBATLOG_MULTIKILL(e) {
      // multikill
      // add the "minimum value", as of 2016-02-06
      // remove the "minimum value", as of 2016-06-23
      expand({
        time: e.time,
        value: 1,
        unit: e.attackername,
        key: e.value,
        type: 'multi_kills',
      });
    },
    DOTA_COMBATLOG_KILLSTREAK(e) {
      // killstreak
      // add the "minimum value", as of 2016-02-06
      // remove the "minimum value", as of 2016-06-23
      expand({
        time: e.time,
        value: 1,
        unit: e.attackername,
        key: e.value,
        type: 'kill_streaks',
      });
    },
    DOTA_COMBATLOG_TEAM_BUILDING_KILL() {
      // team_building_kill
      // System.err.println(cle);
      // e.attackername,  unit that killed the building
      // e.value, this is only really useful if we can get WHICH tower/rax was killed
      // 0 is other?
      // 1 is tower?
      // 2 is rax?
      // 3 is ancient?
    },
    DOTA_COMBATLOG_FIRST_BLOOD() {
      // first_blood
      // time, involved players?
    },
    DOTA_COMBATLOG_MODIFIER_REFRESH() {
      // modifier_refresh
      // no idea what this means
    },
    pings(e) {
      // we're not breaking pings into subtypes atm so just set key to 0 for now
      expand({
        time: e.time,
        type: 'pings',
        slot: e.slot,
        key: 0,
      });
    },
    actions(e) {
      // expand the actions
      expand(Object.assign({}, e, { value: 1 }));
    },
    CHAT_MESSAGE_RUNE_PICKUP(e) {
      expand({
        time: e.time,
        value: 1,
        type: 'runes',
        slot: e.player1,
        key: String(e.value),
      });
      expand({
        time: e.time,
        key: e.value,
        slot: e.player1,
        type: 'runes_log',
      });
    },
    CHAT_MESSAGE_RUNE_BOTTLE() {
      // not tracking rune bottling atm
    },
    CHAT_MESSAGE_HERO_KILL() {
      // player, assisting players
      // player2 killed player 1
      // subsequent players assisted
      // still not perfect as dota can award kills to players when they're killed by towers/creeps
      // chat event does not reflect this
      // e.slot = e.player2;
      // e.key = String(e.player1);
      // currently disabled in favor of combat log kills
    },
    CHAT_MESSAGE_GLYPH_USED() {
      // team glyph
      // player1 = team that used glyph (2/3, or 0/1?)
      // e.team = e.player1;
    },
    CHAT_MESSAGE_PAUSED() {
      // e.slot = e.player1;
      // player1 paused
    },
    CHAT_MESSAGE_TOWER_KILL() {
    },
    CHAT_MESSAGE_TOWER_DENY() {
      // tower (player/team)
      // player1 = slot of player who killed tower (-1 if nonplayer)
      // value (2/3 radiant/dire killed tower, recently 0/1?)
    },
    CHAT_MESSAGE_BARRACKS_KILL() {
      // barracks (player)
      // value id of barracks based on power of 2?
      // Barracks can always be deduced
      // They go in incremental powers of 2
      // starting by the Dire side to the Dire Side, Bottom to Top, Melee to Ranged
      // so Bottom Melee Dire Rax = 1 and Top Ranged Radiant Rax = 2048.
    },
    CHAT_MESSAGE_RECONNECT(e) {
      expand({
        time: e.time,
        type: 'connection_log',
        slot: e.player1,
        event: 'reconnect',
      });
    },
    CHAT_MESSAGE_DISCONNECT_WAIT_FOR_RECONNECT(e) {
      expand({
        time: e.time,
        type: 'connection_log',
        slot: e.player1,
        event: 'disconnect',
      });
    },
    CHAT_MESSAGE_FIRSTBLOOD(e) {
      expand({
        time: e.time,
        type: e.type,
        slot: e.player1,
        key: e.player2,
      });
    },
    CHAT_MESSAGE_AEGIS(e) {
      aegisHolder = e.player1;

      expand({
        time: e.time,
        type: e.type,
        slot: e.player1,
      });
    },
    CHAT_MESSAGE_AEGIS_STOLEN(e) {
      aegisHolder = e.player1;

      expand({
        time: e.time,
        type: e.type,
        slot: e.player1,
      });
    },
    CHAT_MESSAGE_DENIED_AEGIS(e) {
      // aegis (player)
      // player1 = slot who picked up/denied/stole aegis
      expand({
        time: e.time,
        type: e.type,
        slot: e.player1,
      });
    },
    CHAT_MESSAGE_ROSHAN_KILL(e) {
      // player1 = team that killed roshan? (2/3)
      expand({
        time: e.time,
        type: e.type,
        team: e.player1,
      });
    },
    CHAT_MESSAGE_COURIER_LOST(e) {
      // player1 = team that lost courier? (2/3)
      expand({
        time: e.time,
        type: e.type,
        team: e.player1,
      });
    },
    CHAT_MESSAGE_HERO_NOMINATED_BAN() {
      // TODO
    },
    CHAT_MESSAGE_HERO_BANNED() {
      // TODO
    },
    chat(e) {
      // e.slot = name_to_slot[e.unit];
      // push a copy to chat
      expand(e);
    },
    chatwheel(e) {
      expand(e);
    },
    interval(e) {
      if (e.time >= 0) {
        expand(e);
        [
          'stuns',
          'life_state',
          'obs_placed',
          'sen_placed',
          'creeps_stacked',
          'camps_stacked',
          'rune_pickups',
          'randomed',
          'repicked',
          'pred_vict',
          'firstblood_claimed',
          'teamfight_participation',
          'towers_killed',
          'roshans_killed',
          'observers_placed',
        ]
          .forEach((field) => {
            let key;
            let value;
            if (field === 'life_state') {
              key = e[field];
              value = 1;
            } else {
              key = field;
              value = e[field];
            }
            expand({
              time: e.time,
              slot: e.slot,
              type: field,
              key,
              value,
            });
          });
        // if on minute, add to interval arrays
        if (e.time % 60 === 0) {
          expand({
            time: e.time,
            slot: e.slot,
            interval: true,
            type: 'times',
            value: e.time,
          });
          expand({
            time: e.time,
            slot: e.slot,
            interval: true,
            type: 'gold_t',
            value: e.gold,
          });
          expand({
            time: e.time,
            slot: e.slot,
            interval: true,
            type: 'xp_t',
            value: e.xp,
          });
          expand({
            time: e.time,
            slot: e.slot,
            interval: true,
            type: 'lh_t',
            value: e.lh,
          });
          expand({
            time: e.time,
            slot: e.slot,
            interval: true,
            type: 'dn_t',
            value: e.denies,
          });
        }
      }
      // store player position for the first 10 minutes
      if (e.time <= 600 && e.x && e.y) {
        expand({
          time: e.time,
          slot: e.slot,
          type: 'lane_pos',
          key: JSON.stringify([e.x, e.y]),
          posData: true,
        });
      }
    },
    obs(e) {
      expand(Object.assign({}, e, {
        type: 'obs',
        posData: true,
      }));
      expand(Object.assign({}, e, {
        type: 'obs_log',
      }));
    },
    sen(e) {
      expand(Object.assign({}, e, {
        type: 'sen',
        posData: true,
      }));
      expand(Object.assign({}, e, {
        type: 'sen_log',
      }));
    },
    obs_left(e) {
      expand(Object.assign({}, e, {
        type: 'obs_left_log',
      }));
    },
    sen_left(e) {
      expand(Object.assign({}, e, {
        type: 'sen_left_log',
      }));
    },
    epilogue(e) {
      expand(e);
    },
    player_slot(e) {
      expand(e);
    },
    cosmetics(e) {
      expand(e);
    },
  };
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    if (types[e.type]) {
      types[e.type](e);
    } else {
      // console.log('parser emitted unhandled type: %s', e.type);
    }
  }
  return output;
}
module.exports = processExpand;
