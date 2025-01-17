/**
 * Given an event stream, extracts metadata such as game zero time and hero to slot/ID mappings.
 * */
function processMetadata(entries: any[]) {
  const heroToSlot = {};
  const slotToPlayerslot = {};
  const heroIdToSlot = {};
  const abilityLevels = {};
  const metaTypes = {
    interval(e) {
      // check if hero has been assigned to entity
      if (e.hero_id) {
        // grab the end of the name, lowercase it
        const ending = e.unit.slice('CDOTA_Unit_Hero_'.length);
        // the combat log name could involve replacing camelCase with _ or not!
        // double map it so we can look up both cases
        const combatLogName = `npc_dota_hero_${ending.toLowerCase()}`;
        // don't include final underscore here
        // the first letter is always capitalized and will be converted to underscore
        const combatLogName2 = `npc_dota_hero${ending
          .replace(/([A-Z])/g, ($1) => `_${$1.toLowerCase()}`)
          .toLowerCase()}`;
        // console.log(combatLogName, combatLogName2);
        // populate hero_to_slot for combat log mapping
        heroToSlot[combatLogName] = e.slot;
        heroToSlot[combatLogName2] = e.slot;
        // populate hero_to_id for multikills
        // hero_to_id[combatLogName] = e.hero_id;
        // hero_to_id[combatLogName2] = e.hero_id;
        // hero_id_to_slot
        heroIdToSlot[e.hero_id] = e.slot;
      }
    },
    player_slot(e) {
      // map slot number (0-9) to playerslot (0-4, 128-132)
      slotToPlayerslot[e.key] = e.value;
    },
  };
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    if (metaTypes[e.type]) {
      metaTypes[e.type](e);
    }
  }
  return {
    hero_to_slot: heroToSlot,
    slot_to_playerslot: slotToPlayerslot,
    hero_id_to_slot: heroIdToSlot,
    ability_levels: abilityLevels,
    match_id: '',
  };
}
export default processMetadata;
