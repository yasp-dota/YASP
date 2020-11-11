// const performanceOthers = require('./performanceOthers');
function populate(e, container) {
  let t;
  switch (e.type) {
    case 'interval':
      break;
    case 'player_slot':
      container.players[e.key].player_slot = e.value;
      break;
    case 'chat':
    case 'chatwheel':
      container.chat.push(JSON.parse(JSON.stringify(e)));
      break;
    case 'cosmetics':
      container.cosmetics = JSON.parse(e.key);
      break;
    case 'CHAT_MESSAGE_FIRSTBLOOD':
    case 'CHAT_MESSAGE_COURIER_LOST':
    case 'CHAT_MESSAGE_AEGIS':
    case 'CHAT_MESSAGE_AEGIS_STOLEN':
    case 'CHAT_MESSAGE_DENIED_AEGIS':
    case 'CHAT_MESSAGE_ROSHAN_KILL':
    case 'building_kill':
      container.objectives.push(JSON.parse(JSON.stringify(e)));
      break;
    default:
      if (!container.players[e.slot]) {
      // couldn't associate with a player, probably attributed to a creep/tower/necro unit
      // console.log(e);
        return;
      }
      t = container.players[e.slot][e.type];
      if (typeof t === 'undefined') {
      // container.players[0] doesn't have a type for this event
      // console.log("no field in parsed_data.players for %s", e.type);

      } else if (e.posData) {
      // fill 2d hash with x,y values
        const key = JSON.parse(e.key);
        const x = key[0];
        const y = key[1];
        if (!t[x]) {
          t[x] = {};
        }
        if (!t[x][y]) {
          t[x][y] = 0;
        }
        t[x][y] += 1;
      } else if (e.max) {
      // check if value is greater than what was stored in value prop
        if (e.value > t.value) {
          container.players[e.slot][e.type] = e;
        }
      } else if (t.constructor === Array) {
      // determine whether we want the value only (interval) or everything (log)
      // either way this creates a new value so e can be mutated later
        let arrEntry;
        if (e.interval) {
          arrEntry = e.value;
        } else if (e.type === 'starting_items' || e.type === 'purchase_log' || e.type === 'kills_log' || e.type === 'runes_log') {
          arrEntry = {
            time: e.time,
            key: e.key,
          };
          if (e.type === 'starting_items') {
            arrEntry = {
              key: e.key,
              itemslot: e.itemslot,
              charges: e.charges,
            };
          }
          if (e.type === 'kills_log' && e.tracked_death) {
            arrEntry = Object.assign({}, {
              tracked_death: e.tracked_death,
              tracked_sourcename: e.tracked_sourcename,
            }, arrEntry);
          }
        } else {
          arrEntry = JSON.parse(JSON.stringify(e));
        }
        t.push(arrEntry);
      } else if (e.type === 'ability_targets') {
        // e.g. { Telekinesis: { Antimage: 1, Bristleback: 2 }, Fade Bolt: { Lion: 4, Timber: 5 }, ... }
        const ability = e.key[0];
        const target = e.key[1];
        if (t[ability] && t[ability][target]) {
          t[ability][target] += 1;
        } else if (t[ability]) {
          t[ability][target] = 1;
        } else {
          t[ability] = {};
          t[ability][target] = 1;
        }
      } else if (e.type === 'damage_targets') {
        const ability = e.key[0];
        const target = e.key[1];
        const damage = e.value;
        if (!t[ability]) {
          t[ability] = {};
        }
        if (!t[ability][target]) {
          t[ability][target] = 0;
        }
        t[ability][target] += damage;
      } else if (typeof t === 'object') {
      // add it to hash of counts
        e.value = e.value || 1;
        if (t[e.key]) {
          t[e.key] += e.value;
        } else {
          t[e.key] = e.value;
        }

        // performanceOthers(e, container, meta);
      } else if (typeof t === 'string') {
      // string, used for steam id
        container.players[e.slot][e.type] = e.key;
      } else {
      // we must use the full reference since this is a primitive type
        container.players[e.slot][e.type] = e.value;
      }
      break;
  }
}
module.exports = populate;
