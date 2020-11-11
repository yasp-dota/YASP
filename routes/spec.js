const async = require('async');
const constants = require('dotaconstants');
const moment = require('moment');
const { Client } = require('pg');
const config = require('../config');
// const crypto = require('crypto');
// const uuidV4 = require('uuid/v4');
const queue = require('../store/queue');
const queries = require('../store/queries');
const search = require('../store/search');
const searchES = require('../store/searchES');
const buildMatch = require('../store/buildMatch');
const buildStatus = require('../store/buildStatus');
const playerFields = require('./playerFields');
// const getGcData = require('../util/getGcData');
const utility = require('../util/utility');
const su = require('../util/scenariosUtil');
const db = require('../store/db');
const redis = require('../store/redis');
const packageJson = require('../package.json');
const cacheFunctions = require('../store/cacheFunctions');
const params = require('./params');
const properties = require('./properties');

const {
  teamObject, matchObject, heroObject, playerObject,
} = require('./objects');

const {
  redisCount, countPeers, isContributor, matchupToString,
} = utility;
const { subkeys, countCats } = playerFields;
const playerParams = [
  params.accountIdParam,
  params.limitParam,
  params.offsetParam,
  params.winParam,
  params.patchParam,
  params.gameModeParam,
  params.lobbyTypeParam,
  params.regionParam,
  params.dateParam,
  params.laneRoleParam,
  params.heroIdParam,
  params.isRadiantParam,
  params.includedAccountIdParam,
  params.excludedAccountIdParam,
  params.withHeroIdParam,
  params.againstHeroIdParam,
  params.significantParam,
  params.havingParam,
  params.sortParam,
];


function sendDataWithCache(req, res, data, key) {
  if (config.ENABLE_PLAYER_CACHE && req.originalQuery && !Object.keys(req.originalQuery).length) {
    cacheFunctions.write({
      key,
      account_id: req.params.account_id,
    }, JSON.stringify(data), () => {});
  }
  return res.json(data);
}

const spec = {
  swagger: '2.0',
  info: {
    title: 'OpenDota API',
    description: `# Introduction
The OpenDota API provides Dota 2 related data including advanced match data extracted from match replays.

You can find data that can be used to convert hero and ability IDs and other information provided by the API from the [dotaconstants](https://github.com/odota/dotaconstants) repository.

**Beginning 2018-04-22, the OpenDota API is limited to 50,000 free calls per month and 60 requests/minute** We offer a Premium Tier with unlimited API calls and higher rate limits. Check out the [API page](https://www.opendota.com/api-keys) to learn more.
`,
    version: packageJson.version,
  },
  securityDefinitions: {
    api_key: {
      type: 'apiKey',
      name: 'api_key',
      description: `Use an API key to remove monthly call limits and to receive higher rate limits. [Learn more and get your API key](https://www.opendota.com/api-keys).

      Usage example: https://api.opendota.com/api/matches/271145478?api_key=YOUR-API-KEY
      
      API key can also be sent using the authorization header "Authorization: Bearer YOUR-API-KEY"
      `,
      in: 'query',
    },
  },
  host: 'api.opendota.com',
  basePath: '/api',
  produces: [
    'application/json',
  ],
  paths: {
    '/matches/{match_id}': {
      get: {
        summary: 'GET /matches/{match_id}',
        description: 'Match data',
        tags: [
          'matches',
        ],
        parameters: [params.matchIdParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                match_id: {
                  description: 'The ID number of the match assigned by Valve',
                  type: 'integer',
                },
                barracks_status_dire: {
                  description: 'Bitmask. An integer that represents a binary of which barracks are still standing. 63 would mean all barracks still stand at the end of the game.',
                  type: 'integer',
                },
                barracks_status_radiant: {
                  description: 'Bitmask. An integer that represents a binary of which barracks are still standing. 63 would mean all barracks still stand at the end of the game.',
                  type: 'integer',
                },
                chat: {
                  description: 'Array containing information on the chat of the game',
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      time: {
                        description: 'Time in seconds at which the message was said',
                        type: 'integer',
                      },
                      unit: {
                        description: 'Name of the player who sent the message',
                        type: 'string',
                      },
                      key: {
                        description: 'The message the player sent',
                        type: 'string',
                      },
                      slot: {
                        description: 'slot',
                        type: 'integer',
                      },
                      player_slot: properties.player_slot,
                    },
                  },
                },
                cluster: {
                  description: 'cluster',
                  type: 'integer',
                },
                cosmetics: {
                  description: 'cosmetics',
                  type: 'object',
                },
                dire_score: {
                  description: 'Final score for Dire (number of kills on Radiant)',
                  type: 'integer',
                },
                draft_timings: {
                  description: 'draft_timings',
                  type: 'array',
                  items: {
                    description: 'draft_stage',
                    type: 'object',
                    properties: {
                      order: {
                        description: 'order',
                        type: 'integer',
                      },
                      pick: {
                        description: 'pick',
                        type: 'boolean',
                      },
                      active_team: {
                        description: 'active_team',
                        type: 'integer',
                      },
                      hero_id: {
                        description: 'The ID value of the hero played',
                        type: 'integer',
                      },
                      player_slot: properties.player_slot,
                      extra_time: {
                        description: 'extra_time',
                        type: 'integer',
                      },
                      total_time_taken: {
                        description: 'total_time_taken',
                        type: 'integer',
                      },
                    },
                  },
                },
                duration: properties.duration,
                engine: {
                  description: 'engine',
                  type: 'integer',
                },
                first_blood_time: {
                  description: 'Time in seconds at which first blood occurred',
                  type: 'integer',
                },
                game_mode: {
                  description: 'Integer corresponding to game mode played. List of constants can be found here: https://github.com/odota/dotaconstants/blob/master/json/game_mode.json',
                  type: 'integer',
                },
                human_players: {
                  description: 'Number of human players in the game',
                  type: 'integer',
                },
                leagueid: {
                  description: 'leagueid',
                  type: 'integer',
                },
                lobby_type: {
                  description: 'Integer corresponding to lobby type of match. List of constants can be found here: https://github.com/odota/dotaconstants/blob/master/json/lobby_type.json',
                  type: 'integer',
                },
                match_seq_num: {
                  description: 'match_seq_num',
                  type: 'integer',
                },
                negative_votes: {
                  description: 'Number of negative votes the replay received in the in-game client',
                  type: 'integer',
                },
                objectives: {
                  description: 'objectives',
                  type: 'object',
                },
                picks_bans: {
                  description: 'Object containing information on the draft. Each pick/ban contains a boolean relating to whether the choice is a pick or a ban, the hero ID, the team the picked or banned it, and the order.',
                  type: 'object',
                },
                positive_votes: {
                  description: 'Number of positive votes the replay received in the in-game client',
                  type: 'integer',
                },
                radiant_gold_adv: {
                  description: 'Array of the Radiant gold advantage at each minute in the game. A negative number means that Radiant is behind, and thus it is their gold disadvantage. ',
                  type: 'object',
                },
                radiant_score: {
                  description: 'Final score for Radiant (number of kills on Radiant)',
                  type: 'integer',
                },
                radiant_win: properties.radiant_win,
                radiant_xp_adv: {
                  description: 'Array of the Radiant experience advantage at each minute in the game. A negative number means that Radiant is behind, and thus it is their experience disadvantage. ',
                  type: 'object',
                },
                start_time: {
                  description: 'The Unix timestamp at which the game started',
                  type: 'integer',
                },
                teamfights: {
                  description: 'teamfights',
                  type: 'object',
                },
                tower_status_dire: {
                  description: 'Bitmask. An integer that represents a binary of which Dire towers are still standing.',
                  type: 'integer',
                },
                tower_status_radiant: {
                  description: 'Bitmask. An integer that represents a binary of which Radiant towers are still standing.',
                  type: 'integer',
                },
                version: {
                  description: 'Parse version, used internally by OpenDota',
                  type: 'integer',
                },
                replay_salt: {
                  description: 'replay_salt',
                  type: 'integer',
                },
                series_id: {
                  description: 'series_id',
                  type: 'integer',
                },
                series_type: {
                  description: 'series_type',
                  type: 'integer',
                },
                radiant_team: {
                  description: 'radiant_team',
                  type: 'object',
                },
                dire_team: {
                  description: 'dire_team',
                  type: 'object',
                },
                league: {
                  description: 'league',
                  type: 'object',
                },
                skill: {
                  description: 'Skill bracket assigned by Valve (Normal, High, Very High)',
                  type: 'integer',
                },
                players: {
                  description: 'Array of information on individual players',
                  type: 'array',
                  items: {
                    description: 'player',
                    type: 'object',
                    properties: {
                      match_id: {
                        description: 'Match ID',
                        type: 'integer',
                      },
                      player_slot: properties.player_slot,
                      ability_upgrades_arr: {
                        description: 'An array describing how abilities were upgraded',
                        type: 'array',
                        items: {
                          type: 'integer',
                        },
                      },
                      ability_uses: {
                        description: 'Object containing information on how many times the played used their abilities',
                        type: 'object',
                      },
                      ability_targets: {
                        description: 'Object containing information on who the player used their abilities on',
                        type: 'object',
                      },
                      damage_targets: {
                        description: 'Object containing information on how and how much damage the player dealt to other heroes',
                        type: 'object',
                      },
                      account_id: {
                        description: 'account_id',
                        type: 'integer',
                      },
                      actions: {
                        description: 'Object containing information on how many and what type of actions the player issued to their hero',
                        type: 'object',
                      },
                      additional_units: {
                        description: 'Object containing information on additional units the player had under their control',
                        type: 'object',
                      },
                      assists: {
                        description: 'Number of assists the player had',
                        type: 'integer',
                      },
                      backpack_0: {
                        description: 'Item in backpack slot 0',
                        type: 'integer',
                      },
                      backpack_1: {
                        description: 'Item in backpack slot 1',
                        type: 'integer',
                      },
                      backpack_2: {
                        description: 'Item in backpack slot 2',
                        type: 'integer',
                      },
                      buyback_log: {
                        description: 'Array containing information about buybacks',
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            time: {
                              description: 'Time in seconds the buyback occurred',
                              type: 'integer',
                            },
                            slot: {
                              description: 'slot',
                              type: 'integer',
                            },
                            player_slot: properties.player_slot,
                          },
                        },
                      },
                      camps_stacked: {
                        description: 'Number of camps stacked',
                        type: 'integer',
                      },
                      connection_log: {
                        description: 'Array containing information about the player\'s disconnections and reconnections',
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            time: {
                              description: 'Game time in seconds the event ocurred',
                              type: 'integer',
                            },
                            event: {
                              description: 'Event that occurred',
                              type: 'string',
                            },
                            player_slot: properties.player_slot,
                          },
                        },
                      },
                      creeps_stacked: {
                        description: 'Number of creeps stacked',
                        type: 'integer',
                      },
                      damage: {
                        description: 'Object containing information about damage dealt by the player to different units',
                        type: 'object',
                      },
                      damage_inflictor: {
                        description: 'Object containing information about about the sources of this player\'s damage to heroes',
                        type: 'object',
                      },
                      damage_inflictor_received: {
                        description: 'Object containing information about the sources of damage received by this player from heroes',
                        type: 'object',
                      },
                      damage_taken: {
                        description: 'Object containing information about from whom the player took damage',
                        type: 'object',
                      },
                      deaths: {
                        description: 'Number of deaths',
                        type: 'integer',
                      },
                      denies: {
                        description: 'Number of denies',
                        type: 'integer',
                      },
                      dn_t: {
                        description: 'Array containing number of denies at different times of the match',
                        type: 'array',
                        items: {
                          type: 'integer',
                        },
                      },
                      gold: {
                        description: 'Gold at the end of the game',
                        type: 'integer',
                      },
                      gold_per_min: {
                        description: 'Gold Per Minute obtained by this player',
                        type: 'integer',
                      },
                      gold_reasons: {
                        description: 'Object containing information on how the player gainined gold over the course of the match',
                        type: 'object',
                      },
                      gold_spent: {
                        description: 'How much gold the player spent',
                        type: 'integer',
                      },
                      gold_t: {
                        description: 'Array containing total gold at different times of the match',
                        type: 'array',
                        items: {
                          type: 'integer',
                        },
                      },
                      hero_damage: {
                        description: 'Hero Damage Dealt',
                        type: 'integer',
                      },
                      hero_healing: {
                        description: 'Hero Healing Done',
                        type: 'integer',
                      },
                      hero_hits: {
                        description: 'Object containing information on how many ticks of damages the hero inflicted with different spells and damage inflictors',
                        type: 'object',
                      },
                      hero_id: {
                        description: 'The ID value of the hero played',
                        type: 'integer',
                      },
                      item_0: {
                        description: 'Item in the player\'s first slot',
                        type: 'integer',
                      },
                      item_1: {
                        description: 'Item in the player\'s second slot',
                        type: 'integer',
                      },
                      item_2: {
                        description: 'Item in the player\'s third slot',
                        type: 'integer',
                      },
                      item_3: {
                        description: 'Item in the player\'s fourth slot',
                        type: 'integer',
                      },
                      item_4: {
                        description: 'Item in the player\'s fifth slot',
                        type: 'integer',
                      },
                      item_5: {
                        description: 'Item in the player\'s sixth slot',
                        type: 'integer',
                      },
                      item_uses: {
                        description: 'Object containing information about how many times a player used items',
                        type: 'object',
                      },
                      kill_streaks: {
                        description: 'Object containing information about the player\'s killstreaks',
                        type: 'object',
                      },
                      killed: {
                        description: 'Object containing information about what units the player killed',
                        type: 'object',
                      },
                      killed_by: {
                        description: 'Object containing information about who killed the player',
                        type: 'object',
                      },
                      kills: {
                        description: 'Number of kills',
                        type: 'integer',
                      },
                      kills_log: {
                        description: 'Array containing information on which hero the player killed at what time',
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            time: {
                              description: 'Time in seconds the player killed the hero',
                              type: 'integer',
                            },
                            key: {
                              description: 'Hero killed',
                              type: 'string',
                            },
                          },
                        },
                      },
                      lane_pos: {
                        description: 'Object containing information on lane position',
                        type: 'object',
                      },
                      last_hits: {
                        description: 'Number of last hits',
                        type: 'integer',
                      },
                      leaver_status: {
                        description: 'Integer describing whether or not the player left the game. 0: didn\'t leave. 1: left safely. 2+: Abandoned',
                        type: 'integer',
                      },
                      level: {
                        description: 'Level at the end of the game',
                        type: 'integer',
                      },
                      lh_t: {
                        description: 'Array describing last hits at each minute in the game',
                        type: 'array',
                        items: {
                          type: 'integer',
                        },
                      },
                      life_state: {
                        description: 'life_state',
                        type: 'object',
                      },
                      max_hero_hit: {
                        description: 'Object with information on the highest damage instance the player inflicted',
                        type: 'object',
                      },
                      multi_kills: {
                        description: 'Object with information on the number of the number of multikills the player had',
                        type: 'object',
                      },
                      obs: {
                        description: 'Object with information on where the player placed observer wards. The location takes the form (outer number, inner number) and are from ~64-192.',
                        type: 'object',
                      },
                      obs_left_log: {
                        description: 'obs_left_log',
                        type: 'array',
                        items: {
                          type: 'object',
                        },
                      },
                      obs_log: {
                        description: 'Object containing information on when and where the player placed observer wards',
                        type: 'array',
                        items: {
                          type: 'object',
                        },
                      },
                      obs_placed: {
                        description: 'Total number of observer wards placed',
                        type: 'integer',
                      },
                      party_id: {
                        description: 'party_id',
                        type: 'integer',
                      },
                      permanent_buffs: {
                        description: 'Array describing permanent buffs the player had at the end of the game. List of constants can be found here: https://github.com/odota/dotaconstants/blob/master/json/permanent_buffs.json',
                        type: 'array',
                        items: {
                          type: 'object',
                        },
                      },
                      pings: {
                        description: 'Total number of pings',
                        type: 'integer',
                      },
                      purchase: {
                        description: 'Object containing information on the items the player purchased',
                        type: 'object',
                      },
                      purchase_log: {
                        description: 'Object containing information on when items were purchased',
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            time: {
                              description: 'Time in seconds the item was bought',
                              type: 'integer',
                            },
                            key: {
                              description: 'String item name',
                              type: 'string',
                            },
                          },
                        },
                      },
                      rune_pickups: {
                        description: 'Number of runes picked up',
                        type: 'integer',
                      },
                      runes: {
                        description: 'Object with information about which runes the player picked up',
                        type: 'object',
                        additionalProperties: {
                          type: 'integer',
                        },
                      },
                      runes_log: {
                        description: 'Array with information on when runes were picked up',
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            time: {
                              description: 'Time in seconds rune picked up',
                              type: 'integer',
                            },
                            key: {
                              description: 'key',
                              type: 'integer',
                            },
                          },
                        },
                      },
                      sen: {
                        description: 'Object with information on where sentries were placed. The location takes the form (outer number, inner number) and are from ~64-192.',
                        type: 'object',
                      },
                      sen_left_log: {
                        description: 'Array containing information on when and where the player placed sentries',
                        type: 'array',
                        items: {
                          type: 'object',
                        },
                      },
                      sen_log: {
                        description: 'Array with information on when and where sentries were placed by the player',
                        type: 'array',
                        items: {
                          type: 'object',
                        },
                      },
                      sen_placed: {
                        description: 'How many sentries were placed by the player',
                        type: 'integer',
                      },
                      starting_items: {
                        description: 'Object containing information on items at the start of the game',
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            key: {
                              description: 'Item name',
                              type: 'string',
                            },
                            itemslot: {
                              description: 'Inventory slot the item was in',
                              type: 'integer',
                            },
                            charges: {
                              description: 'Amount of charges an item has',
                              type: 'integer',
                            },
                          },
                        },
                      },
                      stuns: {
                        description: 'Total stun duration of all stuns by the player',
                        type: 'number',
                      },
                      times: {
                        description: 'Time in seconds corresponding to the time of entries of other arrays in the match.',
                        type: 'array',
                        items: {
                          type: 'integer',
                        },
                      },
                      tower_damage: {
                        description: 'Total tower damage done by the player',
                        type: 'integer',
                      },
                      xp_per_min: {
                        description: 'Experience Per Minute obtained by the player',
                        type: 'integer',
                      },
                      xp_reasons: {
                        description: 'Object containing information on the sources of this player\'s experience',
                        type: 'object',
                      },
                      xp_t: {
                        description: 'Experience at each minute of the game',
                        type: 'array',
                        items: {
                          type: 'integer',
                        },
                      },
                      personaname: {
                        description: 'personaname',
                        type: 'string',
                      },
                      name: {
                        description: 'name',
                        type: 'string',
                      },
                      last_login: {
                        description: 'Time in seconds of last login of the player',
                        type: 'dateTime',
                      },
                      radiant_win: properties.radiant_win,
                      start_time: {
                        description: 'Start time of the match in seconds since 1970',
                        type: 'integer',
                      },
                      duration: properties.duration,
                      cluster: {
                        description: 'cluster',
                        type: 'integer',
                      },
                      lobby_type: {
                        description: 'Integer corresponding to lobby type of match. List of constants can be found here: https://github.com/odota/dotaconstants/blob/master/json/lobby_type.json',
                        type: 'integer',
                      },
                      game_mode: {
                        description: 'Integer corresponding to game mode played. List of constants can be found here: https://github.com/odota/dotaconstants/blob/master/json/game_mode.json',
                        type: 'integer',
                      },
                      patch: {
                        description: 'Integer representing the patch the game was played on',
                        type: 'integer',
                      },
                      region: {
                        description: 'Integer corresponding to the region the game was played on',
                        type: 'integer',
                      },
                      isRadiant: {
                        description: 'Boolean for whether or not the player is on Radiant',
                        type: 'boolean',
                      },
                      win: {
                        description: 'Binary integer representing whether or not the player won',
                        type: 'integer',
                      },
                      lose: {
                        description: 'Binary integer representing whether or not the player lost',
                        type: 'integer',
                      },
                      total_gold: {
                        description: 'Total gold at the end of the game',
                        type: 'integer',
                      },
                      total_xp: {
                        description: 'Total experience at the end of the game',
                        type: 'integer',
                      },
                      kills_per_min: {
                        description: 'Number of kills per minute',
                        type: 'number',
                      },
                      kda: {
                        description: 'kda',
                        type: 'number',
                      },
                      abandons: {
                        description: 'abandons',
                        type: 'integer',
                      },
                      neutral_kills: {
                        description: 'Total number of neutral creeps killed',
                        type: 'integer',
                      },
                      tower_kills: {
                        description: 'Total number of tower kills the player had',
                        type: 'integer',
                      },
                      courier_kills: {
                        description: 'Total number of courier kills the player had',
                        type: 'integer',
                      },
                      lane_kills: {
                        description: 'Total number of lane creeps killed by the player',
                        type: 'integer',
                      },
                      hero_kills: {
                        description: 'Total number of heroes killed by the player',
                        type: 'integer',
                      },
                      observer_kills: {
                        description: 'Total number of observer wards killed by the player',
                        type: 'integer',
                      },
                      sentry_kills: {
                        description: 'Total number of sentry wards killed by the player',
                        type: 'integer',
                      },
                      roshan_kills: {
                        description: 'Total number of roshan kills (last hit on roshan) the player had',
                        type: 'integer',
                      },
                      necronomicon_kills: {
                        description: 'Total number of Necronomicon creeps killed by the player',
                        type: 'integer',
                      },
                      ancient_kills: {
                        description: 'Total number of Ancient creeps killed by the player',
                        type: 'integer',
                      },
                      buyback_count: {
                        description: 'Total number of buyback the player used',
                        type: 'integer',
                      },
                      observer_uses: {
                        description: 'Number of observer wards used',
                        type: 'integer',
                      },
                      sentry_uses: {
                        description: 'Number of sentry wards used',
                        type: 'integer',
                      },
                      lane_efficiency: {
                        description: 'lane_efficiency',
                        type: 'number',
                      },
                      lane_efficiency_pct: {
                        description: 'lane_efficiency_pct',
                        type: 'number',
                      },
                      lane: {
                        description: 'Integer referring to which lane the hero laned in',
                        type: 'integer',
                      },
                      lane_role: {
                        description: 'lane_role',
                        type: 'integer',
                      },
                      is_roaming: {
                        description: 'Boolean referring to whether or not the player roamed',
                        type: 'boolean',
                      },
                      purchase_time: {
                        description: 'Object with information on when the player last purchased an item',
                        type: 'object',
                      },
                      first_purchase_time: {
                        description: 'Object with information on when the player first puchased an item',
                        type: 'object',
                      },
                      item_win: {
                        description: 'Object with information on whether or not the item won',
                        type: 'object',
                      },
                      item_usage: {
                        description: 'Object containing binary integers the tell whether the item was purchased by the player (note: this is always 1)',
                        type: 'object',
                      },
                      purchase_tpscroll: {
                        description: 'Total number of TP scrolls purchased by the player',
                        type: 'object',
                      },
                      actions_per_min: {
                        description: 'Actions per minute',
                        type: 'integer',
                      },
                      life_state_dead: {
                        description: 'life_state_dead',
                        type: 'integer',
                      },
                      rank_tier: {
                        description: 'The rank tier of the player. Tens place indicates rank, ones place indicates stars.',
                        type: 'integer',
                      },
                      cosmetics: {
                        description: 'cosmetics',
                        type: 'array',
                        items: {
                          type: 'integer',
                        },
                      },
                      benchmarks: {
                        description: 'Object containing information on certain benchmarks like GPM, XPM, KDA, tower damage, etc',
                        type: 'object',
                      },
                    },
                  },
                },
                patch: {
                  description: 'Information on the patch version the game is played on',
                  type: 'integer',
                },
                region: {
                  description: 'Integer corresponding to the region the game was played on',
                  type: 'integer',
                },
                all_word_counts: {
                  description: 'Word counts of the all chat messages in the player\'s games',
                  type: 'object',
                },
                my_word_counts: {
                  description: 'Word counts of the player\'s all chat messages',
                  type: 'object',
                },
                throw: {
                  description: 'Maximum gold advantage of the player\'s team if they lost the match',
                  type: 'integer',
                },
                comeback: {
                  description: 'Maximum gold disadvantage of the player\'s team if they won the match',
                  type: 'integer',
                },
                loss: {
                  description: 'Maximum gold disadvantage of the player\'s team if they lost the match',
                  type: 'integer',
                },
                win: {
                  description: 'Maximum gold advantage of the player\'s team if they won the match',
                  type: 'integer',
                },
                replay_url: {
                  description: 'replay_url',
                  type: 'string',
                },
              },
            },
          },
        },
        route: () => '/matches/:match_id/:info?',
        func: async (req, res, cb) => {
          try {
            const match = await buildMatch(req.params.match_id, req.query);
            if (!match) {
              return cb();
            }
            return res.json(match);
          } catch (err) {
            return cb(err);
          }
        },
      },
    },
    '/playersByRank': {
      get: {
        summary: 'GET /playersByRank',
        description: 'Players ordered by rank/medal tier',
        tags: ['playersByRank'],
        parameters: [],
        route: () => '/playersByRank',
        func: (req, res, cb) => {
          db.raw(`
          SELECT account_id, rating, fh_unavailable
          FROM players
          JOIN rank_tier
          USING (account_id)
          ORDER BY rating DESC
          LIMIT 100
          `, [])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                account_id: {
                  description: 'account_id',
                  type: 'number',
                },
                rank_tier: {
                  description: 'Integer indicating the rank/medal of the player',
                  type: 'number',
                },
                fh_unavailable: {
                  description: 'Indicates if we were unable to fetch full history for this player due to privacy settings',
                  type: 'boolean',
                },
              },
            },
          },
        },
      },
    },
    '/players/{account_id}': {
      get: {
        summary: 'GET /players/{account_id}',
        description: 'Player data',
        tags: [
          'players',
        ],
        parameters: [params.accountIdParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                tracked_until: {
                  description: 'tracked_until',
                  type: 'string',
                },
                solo_competitive_rank: {
                  description: 'solo_competitive_rank',
                  type: 'string',
                },
                competitive_rank: {
                  description: 'competitive_rank',
                  type: 'string',
                },
                rank_tier: {
                  description: 'rank_tier',
                  type: 'number',
                },
                leaderboard_rank: {
                  description: 'leaderboard_rank',
                  type: 'number',
                },
                mmr_estimate: {
                  description: 'mmr_estimate',
                  type: 'object',
                  properties: {
                    estimate: {
                      description: 'estimate',
                      type: 'number',
                    },
                    stdDev: {
                      description: 'stdDev',
                      type: 'number',
                    },
                    n: {
                      description: 'n',
                      type: 'integer',
                    },
                  },
                },
                profile: {
                  description: 'profile',
                  type: 'object',
                  properties: {
                    account_id: {
                      description: 'account_id',
                      type: 'integer',
                    },
                    personaname: {
                      description: 'personaname',
                      type: 'string',
                    },
                    name: {
                      description: 'name',
                      type: 'string',
                    },
                    plus: {
                      description: 'Boolean indicating status of current Dota Plus subscription',
                      type: 'boolean',
                    },
                    cheese: {
                      description: 'cheese',
                      type: 'integer',
                    },
                    steamid: {
                      description: 'steamid',
                      type: 'string',
                    },
                    avatar: {
                      description: 'avatar',
                      type: 'string',
                    },
                    avatarmedium: {
                      description: 'avatarmedium',
                      type: 'string',
                    },
                    avatarfull: {
                      description: 'avatarfull',
                      type: 'string',
                    },
                    profileurl: {
                      description: 'profileurl',
                      type: 'string',
                    },
                    last_login: {
                      description: 'last_login',
                      type: 'string',
                    },
                    loccountrycode: {
                      description: 'loccountrycode',
                      type: 'string',
                    },
                    is_contributor: {
                      description: 'Boolean indicating if the user contributed to the development of OpenDota',
                      type: 'boolean',
                      default: false,
                    },
                  },
                },
              },
            },
          },
        },
        route: () => '/players/:account_id',
        func: (req, res, cb) => {
          const accountId = Number(req.params.account_id);
          async.parallel({
            profile(cb) {
              queries.getPlayer(db, accountId, (err, playerData) => {
                if (playerData !== null && playerData !== undefined) {
                  playerData.is_contributor = isContributor(accountId);
                }
                cb(err, playerData);
              });
            },
            tracked_until(cb) {
              redis.zscore('tracked', accountId, cb);
            },
            solo_competitive_rank(cb) {
              db.first().from('solo_competitive_rank').where({ account_id: accountId }).asCallback((err, row) => {
                cb(err, row ? row.rating : null);
              });
            },
            competitive_rank(cb) {
              db.first().from('competitive_rank').where({ account_id: accountId }).asCallback((err, row) => {
                cb(err, row ? row.rating : null);
              });
            },
            rank_tier(cb) {
              db.first().from('rank_tier').where({ account_id: accountId }).asCallback((err, row) => {
                cb(err, row ? row.rating : null);
              });
            },
            leaderboard_rank(cb) {
              db.first().from('leaderboard_rank').where({ account_id: accountId }).asCallback((err, row) => {
                cb(err, row ? row.rating : null);
              });
            },
            mmr_estimate(cb) {
              queries.getMmrEstimate(accountId, (err, est) => cb(err, est || {}));
            },
          }, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result);
          });
        },
      },
    },
    '/players/{account_id}/wl': {
      get: {
        summary: 'GET /players/{account_id}/wl',
        description: 'Win/Loss count',
        tags: [
          'players',
        ],
        parameters: playerParams,
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                win: {
                  description: 'Number of wins',
                  type: 'integer',
                },
                lose: {
                  description: 'Number of loses',
                  type: 'integer',
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/wl',
        func: (req, res, cb) => {
          const result = {
            win: 0,
            lose: 0,
          };
          req.queryObj.project = req.queryObj.project.concat('player_slot', 'radiant_win');
          queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
            if (err) {
              return cb(err);
            }
            cache.forEach((m) => {
              if (utility.isRadiant(m) === m.radiant_win) {
                result.win += 1;
              } else {
                result.lose += 1;
              }
            });
            return sendDataWithCache(req, res, result, 'wl');
          });
        },
      },
    },
    '/players/{account_id}/recentMatches': {
      get: {
        summary: 'GET /players/{account_id}/recentMatches',
        description: 'Recent matches played',
        tags: [
          'players',
        ],
        parameters: [params.accountIdParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                description: 'match',
                type: 'object',
                properties: {
                  match_id: {
                    description: 'Match ID',
                    type: 'integer',
                  },
                  player_slot: properties.player_slot,
                  radiant_win: properties.radiant_win,
                  duration: properties.duration,
                  game_mode: {
                    description: 'Integer corresponding to game mode played. List of constants can be found here: https://github.com/odota/dotaconstants/blob/master/json/game_mode.json',
                    type: 'integer',
                  },
                  lobby_type: {
                    description: 'Integer corresponding to lobby type of match. List of constants can be found here: https://github.com/odota/dotaconstants/blob/master/json/lobby_type.json',
                    type: 'integer',
                  },
                  hero_id: {
                    description: 'The ID value of the hero played',
                    type: 'integer',
                  },
                  start_time: {
                    description: 'Start time of the match in seconds elapsed since 1970',
                    type: 'integer',
                  },
                  version: {
                    description: 'version',
                    type: 'integer',
                  },
                  kills: {
                    description: 'Total kills the player had at the end of the match',
                    type: 'integer',
                  },
                  deaths: {
                    description: 'Total deaths the player had at the end of the match',
                    type: 'integer',
                  },
                  assists: {
                    description: 'Total assists the player had at the end of the match',
                    type: 'integer',
                  },
                  skill: {
                    description: 'Skill bracket assigned by Valve (Normal, High, Very High)',
                    type: 'integer',
                  },
                  lane: {
                    description: 'Integer corresponding to which lane the player laned in for the match',
                    type: 'integer',
                  },
                  lane_role: {
                    description: 'lane_role',
                    type: 'integer',
                  },
                  is_roaming: {
                    description: 'Boolean describing whether or not the player roamed',
                    type: 'boolean',
                  },
                  cluster: {
                    description: 'cluster',
                    type: 'integer',
                  },
                  leaver_status: {
                    description: 'Integer describing whether or not the player left the game. 0: didn\'t leave. 1: left safely. 2+: Abandoned',
                    type: 'integer',
                  },
                  party_size: {
                    description: 'Size of the players party. If not in a party, will return 1.',
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/recentMatches',
        func: (req, res, cb) => {
          queries.getPlayerMatches(req.params.account_id, {
            project: req.queryObj.project.concat(['hero_id',
              'start_time',
              'duration',
              'player_slot',
              'radiant_win',
              'game_mode',
              'lobby_type',
              'version',
              'kills',
              'deaths',
              'assists',
              'skill',
              'xp_per_min',
              'gold_per_min',
              'hero_damage',
              'tower_damage',
              'hero_healing',
              'last_hits',
              'lane',
              'lane_role',
              'is_roaming',
              'cluster',
              'leaver_status',
              'party_size']),
            dbLimit: 20,
          }, (err, cache) => {
            if (err) {
              return cb(err);
            }
            return res.json(cache.filter(match => match.duration));
          });
        },
      },
    },
    '/players/{account_id}/matches': {
      get: {
        summary: 'GET /players/{account_id}/matches',
        description: 'Matches played',
        tags: [
          'players',
        ],
        parameters: playerParams.concat(params.projectParam),
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                description: 'Object containing information on the match',
                type: 'object',
                properties: {
                  match_id: {
                    description: 'Match ID',
                    type: 'integer',
                  },
                  player_slot: properties.player_slot,
                  radiant_win: properties.radiant_win,
                  duration: properties.duration,
                  game_mode: {
                    description: 'Integer corresponding to game mode played. List of constants can be found here: https://github.com/odota/dotaconstants/blob/master/json/game_mode.json',
                    type: 'integer',
                  },
                  lobby_type: {
                    description: 'Integer corresponding to lobby type of match. List of constants can be found here: https://github.com/odota/dotaconstants/blob/master/json/lobby_type.json',
                    type: 'integer',
                  },
                  hero_id: {
                    description: 'The ID value of the hero played',
                    type: 'integer',
                  },
                  start_time: {
                    description: 'Time the game started in seconds since 1970',
                    type: 'integer',
                  },
                  version: {
                    description: 'version',
                    type: 'integer',
                  },
                  kills: {
                    description: 'Total kills the player had at the end of the game',
                    type: 'integer',
                  },
                  deaths: {
                    description: 'Total deaths the player had at the end of the game',
                    type: 'integer',
                  },
                  assists: {
                    description: 'Total assists the player had at the end of the game',
                    type: 'integer',
                  },
                  skill: {
                    description: 'Skill bracket assigned by Valve (Normal, High, Very High)',
                    type: 'integer',
                  },
                  party_size: {
                    description: "Size of the player's party",
                    type: 'integer',
                  },
                  heroes: {
                    description: 'heroes (requires ?project=heroes)',
                    type: 'object',
                    properties: {
                      player_slot: {
                        description: 'Which slot the player is in. 0-127 are Radiant, 128-255 are Dire',
                        type: 'object',
                        properties: {
                          account_id: {
                            description: 'account_id',
                            type: 'integer',
                          },
                          hero_id: {
                            description: 'The ID value of the hero played',
                            type: 'integer',
                          },
                          player_slot: properties.player_slot,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/matches',
        func: (req, res, cb) => {
          // Use passed fields as additional fields, if available
          const additionalFields = req.query.project || ['hero_id', 'start_time', 'duration', 'player_slot', 'radiant_win', 'game_mode', 'lobby_type', 'version', 'kills', 'deaths', 'assists', 'skill', 'leaver_status', 'party_size'];
          req.queryObj.project = req.queryObj.project.concat(additionalFields);
          queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
            if (err) {
              return cb(err);
            }
            return res.json(cache);
          });
        },
      },
    },
    '/players/{account_id}/heroes': {
      get: {
        summary: 'GET /players/{account_id}/heroes',
        description: 'Heroes played',
        tags: ['players'],
        parameters: playerParams,
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                description: 'hero',
                type: 'object',
                properties: {
                  hero_id: {
                    description: 'The ID value of the hero played',
                    type: 'string',
                  },
                  last_played: {
                    description: 'last_played',
                    type: 'integer',
                  },
                  games: {
                    description: 'games',
                    type: 'integer',
                  },
                  win: {
                    description: 'win',
                    type: 'integer',
                  },
                  with_games: {
                    description: 'with_games',
                    type: 'integer',
                  },
                  with_win: {
                    description: 'with_win',
                    type: 'integer',
                  },
                  against_games: {
                    description: 'against_games',
                    type: 'integer',
                  },
                  against_win: {
                    description: 'against_win',
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/heroes',
        func: (req, res, cb) => {
          const heroes = {};
          // prefill heroes with every hero
          Object.keys(constants.heroes).forEach((heroId) => {
            const hero = {
              hero_id: heroId,
              last_played: 0,
              games: 0,
              win: 0,
              with_games: 0,
              with_win: 0,
              against_games: 0,
              against_win: 0,
            };
            heroes[heroId] = hero;
          });
          req.queryObj.project = req.queryObj.project.concat('heroes', 'account_id', 'start_time', 'player_slot', 'radiant_win');
          queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
            if (err) {
              return cb(err);
            }
            cache.forEach((m) => {
              const { isRadiant } = utility;
              const playerWin = isRadiant(m) === m.radiant_win;
              const group = m.heroes || {};
              Object.keys(group).forEach((key) => {
                const tm = group[key];
                const tmHero = tm.hero_id;
                // don't count invalid heroes
                if (tmHero in heroes) {
                  if (isRadiant(tm) === isRadiant(m)) {
                    if (tm.account_id === m.account_id) {
                      heroes[tmHero].games += 1;
                      heroes[tmHero].win += playerWin ? 1 : 0;
                      if (m.start_time > heroes[tmHero].last_played) {
                        heroes[tmHero].last_played = m.start_time;
                      }
                    } else {
                      heroes[tmHero].with_games += 1;
                      heroes[tmHero].with_win += playerWin ? 1 : 0;
                    }
                  } else {
                    heroes[tmHero].against_games += 1;
                    heroes[tmHero].against_win += playerWin ? 1 : 0;
                  }
                }
              });
            });
            const result = Object.keys(heroes)
              .map(k => heroes[k])
              .filter(hero => !req.queryObj.having || hero.games >= Number(req.queryObj.having))
              .sort((a, b) => b.games - a.games);
            return sendDataWithCache(req, res, result, 'heroes');
          });
        },
      },
    },
    '/players/{account_id}/peers': {
      get: {
        summary: 'GET /players/{account_id}/peers',
        description: 'Players played with',
        tags: [
          'players',
        ],
        parameters: playerParams,
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  account_id: {
                    description: 'account_id',
                    type: 'integer',
                  },
                  last_played: {
                    description: 'last_played',
                    type: 'integer',
                  },
                  win: {
                    description: 'win',
                    type: 'integer',
                  },
                  games: {
                    description: 'games',
                    type: 'integer',
                  },
                  with_win: {
                    description: 'with_win',
                    type: 'integer',
                  },
                  with_games: {
                    description: 'with_games',
                    type: 'integer',
                  },
                  against_win: {
                    description: 'against_win',
                    type: 'integer',
                  },
                  against_games: {
                    description: 'against_games',
                    type: 'integer',
                  },
                  with_gpm_sum: {
                    description: 'with_gpm_sum',
                    type: 'integer',
                  },
                  with_xpm_sum: {
                    description: 'with_xpm_sum',
                    type: 'integer',
                  },
                  personaname: {
                    description: 'personaname',
                    type: 'string',
                  },
                  name: {
                    description: 'name',
                    type: 'string',
                  },
                  is_contributor: {
                    description: 'is_contributor',
                    type: 'boolean',
                  },
                  last_login: {
                    description: 'last_login',
                    type: 'string',
                  },
                  avatar: {
                    description: 'avatar',
                    type: 'string',
                  },
                  avatarfull: {
                    description: 'avatarfull',
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/peers',
        func: (req, res, cb) => {
          req.queryObj.project = req.queryObj.project.concat('heroes', 'start_time', 'player_slot', 'radiant_win', 'gold_per_min', 'xp_per_min');
          queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
            if (err) {
              return cb(err);
            }
            const teammates = countPeers(cache);
            return queries.getPeers(db, teammates, {
              account_id: req.params.account_id,
            }, (err, result) => {
              if (err) {
                return cb(err);
              }
              return sendDataWithCache(req, res, result, 'peers');
            });
          });
        },
      },
    },
    '/players/{account_id}/pros': {
      get: {
        summary: 'GET /players/{account_id}/pros',
        description: 'Pro players played with',
        tags: [
          'players',
        ],
        parameters: playerParams,
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  account_id: {
                    description: 'account_id',
                    type: 'integer',
                  },
                  name: {
                    description: 'name',
                    type: 'string',
                  },
                  country_code: {
                    description: 'country_code',
                    type: 'string',
                  },
                  fantasy_role: {
                    description: 'fantasy_role',
                    type: 'integer',
                  },
                  team_id: {
                    description: 'team_id',
                    type: 'integer',
                  },
                  team_name: {
                    description: 'team_name',
                    type: 'string',
                  },
                  team_tag: {
                    description: 'team_tag',
                    type: 'string',
                  },
                  is_locked: {
                    description: 'is_locked',
                    type: 'boolean',
                  },
                  is_pro: {
                    description: 'is_pro',
                    type: 'boolean',
                  },
                  locked_until: {
                    description: 'locked_until',
                    type: 'integer',
                  },
                  steamid: {
                    description: 'steamid',
                    type: 'string',
                  },
                  avatar: {
                    description: 'avatar',
                    type: 'string',
                  },
                  avatarmedium: {
                    description: 'avatarmedium',
                    type: 'string',
                  },
                  avatarfull: {
                    description: 'avatarfull',
                    type: 'string',
                  },
                  profileurl: {
                    description: 'profileurl',
                    type: 'string',
                  },
                  last_login: {
                    description: 'last_login',
                    type: 'dateTime',
                  },
                  full_history_time: {
                    description: 'full_history_time',
                    type: 'dateTime',
                  },
                  cheese: {
                    description: 'cheese',
                    type: 'integer',
                  },
                  fh_unavailable: {
                    description: 'fh_unavailable',
                    type: 'boolean',
                  },
                  loccountrycode: {
                    description: 'loccountrycode',
                    type: 'string',
                  },
                  last_played: {
                    description: 'last_played',
                    type: 'integer',
                  },
                  win: {
                    description: 'win',
                    type: 'integer',
                  },
                  games: {
                    description: 'games',
                    type: 'integer',
                  },
                  with_win: {
                    description: 'with_win',
                    type: 'integer',
                  },
                  with_games: {
                    description: 'with_games',
                    type: 'integer',
                  },
                  against_win: {
                    description: 'against_win',
                    type: 'integer',
                  },
                  against_games: {
                    description: 'against_games',
                    type: 'integer',
                  },
                  with_gpm_sum: {
                    description: 'with_gpm_sum',
                    type: 'integer',
                  },
                  with_xpm_sum: {
                    description: 'with_xpm_sum',
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/pros',
        func: (req, res, cb) => {
          req.queryObj.project = req.queryObj.project.concat('heroes', 'start_time', 'player_slot', 'radiant_win');
          queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
            if (err) {
              return cb(err);
            }
            const teammates = countPeers(cache);
            return queries.getProPeers(db, teammates, {
              account_id: req.params.account_id,
            }, (err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result);
            });
          });
        },
      },
    },
    '/players/{account_id}/totals': {
      get: {
        summary: 'GET /players/{account_id}/totals',
        description: 'Totals in stats',
        tags: [
          'players',
        ],
        parameters: playerParams,
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    description: 'field',
                    type: 'string',
                  },
                  n: {
                    description: 'number',
                    type: 'integer',
                  },
                  sum: {
                    description: 'sum',
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/totals',
        func: (req, res, cb) => {
          const result = {};
          Object.keys(subkeys).forEach((key) => {
            result[key] = {
              field: key,
              n: 0,
              sum: 0,
            };
          });
          req.queryObj.project = req.queryObj.project.concat(Object.keys(subkeys));
          queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
            if (err) {
              return cb(err);
            }
            cache.forEach((m) => {
              Object.keys(subkeys).forEach((key) => {
                if (m[key] !== null && m[key] !== undefined) {
                  result[key].n += 1;
                  result[key].sum += Number(m[key]);
                }
              });
            });
            return res.json(Object.keys(result).map(key => result[key]));
          });
        },
      },
    },
    '/players/{account_id}/counts': {
      get: {
        summary: 'GET /players/{account_id}/counts',
        description: 'Counts in categories',
        tags: [
          'players',
        ],
        parameters: playerParams,
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                leaver_status: {
                  description: 'Integer describing whether or not the player left the game. 0: didn\'t leave. 1: left safely. 2+: Abandoned',
                  type: 'object',
                },
                game_mode: {
                  description: 'Integer corresponding to game mode played. List of constants can be found here: https://github.com/odota/dotaconstants/blob/master/json/game_mode.json',
                  type: 'object',
                },
                lobby_type: {
                  description: 'Integer corresponding to lobby type of match. List of constants can be found here: https://github.com/odota/dotaconstants/blob/master/json/lobby_type.json',
                  type: 'object',
                },
                lane_role: {
                  description: 'lane_role',
                  type: 'object',
                },
                region: {
                  description: 'Integer corresponding to the region the game was played on',
                  type: 'object',
                },
                patch: {
                  description: 'patch',
                  type: 'object',
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/counts',
        func: (req, res, cb) => {
          const result = {};
          Object.keys(countCats).forEach((key) => {
            result[key] = {};
          });
          req.queryObj.project = req.queryObj.project.concat(Object.keys(countCats));
          queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
            if (err) {
              return cb(err);
            }
            cache.forEach((m) => {
              m.is_radiant = utility.isRadiant(m);
              Object.keys(countCats).forEach((key) => {
                if (!result[key][Math.floor(m[key])]) {
                  result[key][Math.floor(m[key])] = {
                    games: 0,
                    win: 0,
                  };
                }
                result[key][Math.floor(m[key])].games += 1;
                const won = Number(m.radiant_win === utility.isRadiant(m));
                result[key][Math.floor(m[key])].win += won;
              });
            });
            return res.json(result);
          });
        },
      },
    },
    '/players/{account_id}/histograms/{field}': {
      get: {
        summary: 'GET /players/{account_id}/histograms',
        description: 'Distribution of matches in a single stat',
        tags: [
          'players',
        ],
        parameters: playerParams.concat(params.fieldParam),
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          },
        },
        route: () => '/players/:account_id/histograms/:field',
        func: (req, res, cb) => {
          const { field } = req.params;
          req.queryObj.project = req.queryObj.project.concat('radiant_win', 'player_slot').concat([field].filter(f => subkeys[f]));
          queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
            if (err) {
              return cb(err);
            }
            const buckets = 40;
            // Find the maximum value to determine how large each bucket should be
            const max = Math.max(...cache.map(m => m[field]));
            // Round the bucket size up to the nearest integer
            const bucketSize = Math.ceil((max + 1) / buckets);
            const bucketArray = Array.from({
              length: buckets,
            }, (value, index) => ({
              x: bucketSize * index,
              games: 0,
              win: 0,
            }));
            cache.forEach((m) => {
              if (m[field] || m[field] === 0) {
                const index = Math.floor(m[field] / bucketSize);
                if (bucketArray[index]) {
                  bucketArray[index].games += 1;
                  bucketArray[index].win += utility.isRadiant(m) === m.radiant_win ? 1 : 0;
                }
              }
            });
            return res.json(bucketArray);
          });
        },
      },
    },
    '/players/{account_id}/wardmap': {
      get: {
        summary: 'GET /players/{account_id}/wardmap',
        description: 'Wards placed in matches played',
        tags: [
          'players',
        ],
        parameters: playerParams,
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                obs: {
                  description: 'obs',
                  type: 'object',
                },
                sen: {
                  description: 'sen',
                  type: 'object',
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/wardmap',
        func: (req, res, cb) => {
          const result = {
            obs: {},
            sen: {},
          };
          req.queryObj.project = req.queryObj.project.concat(Object.keys(result));
          queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
            if (err) {
              return cb(err);
            }
            cache.forEach((m) => {
              Object.keys(result).forEach((key) => {
                utility.mergeObjects(result[key], m[key]);
              });
            });
            return res.json(result);
          });
        },
      },
    },
    '/players/{account_id}/wordcloud': {
      get: {
        summary: 'GET /players/{account_id}/wordcloud',
        description: 'Words said/read in matches played',
        tags: [
          'players',
        ],
        parameters: playerParams,
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                my_word_counts: {
                  description: 'my_word_counts',
                  type: 'object',
                },
                all_word_counts: {
                  description: 'all_word_counts',
                  type: 'object',
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/wordcloud',
        func: (req, res, cb) => {
          const result = {
            my_word_counts: {},
            all_word_counts: {},
          };
          req.queryObj.project = req.queryObj.project.concat(Object.keys(result));
          queries.getPlayerMatches(req.params.account_id, req.queryObj, (err, cache) => {
            if (err) {
              return cb(err);
            }
            cache.forEach((m) => {
              Object.keys(result).forEach((key) => {
                utility.mergeObjects(result[key], m[key]);
              });
            });
            return res.json(result);
          });
        },
      },
    },
    '/players/{account_id}/ratings': {
      get: {
        summary: 'GET /players/{account_id}/ratings',
        description: 'Player rating history',
        tags: [
          'players',
        ],
        parameters: [params.accountIdParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  account_id: {
                    description: 'account_id',
                    type: 'integer',
                  },
                  match_id: {
                    description: 'match_id',
                    type: 'integer',
                  },
                  solo_competitive_rank: {
                    description: 'solo_competitive_rank',
                    type: 'integer',
                  },
                  competitive_rank: {
                    description: 'competitive_rank',
                    type: 'integer',
                  },
                  time: {
                    description: 'time',
                    type: 'dateTime',
                  },
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/ratings',
        func: (req, res, cb) => {
          queries.getPlayerRatings(db, req.params.account_id, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result);
          });
        },
      },
    },
    '/players/{account_id}/rankings': {
      get: {
        summary: 'GET /players/{account_id}/rankings',
        description: 'Player hero rankings',
        tags: [
          'players',
        ],
        parameters: [params.accountIdParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properies: {
                  hero_id: {
                    description: 'The ID value of the hero played',
                    type: 'string',
                  },
                  rank: {
                    description: 'percent_rank',
                    type: 'number',
                  },
                  card: {
                    description: 'numeric_rank',
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
        route: () => '/players/:account_id/rankings',
        func: (req, res, cb) => {
          queries.getPlayerHeroRankings(req.params.account_id, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result);
          });
        },
      },
    },
    '/players/{account_id}/refresh': {
      post: {
        summary: 'POST /players/{account_id}/refresh',
        description: 'Refresh player match history',
        tags: [
          'players',
        ],
        parameters: [params.accountIdParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
            },
          },
        },
        route: () => '/players/:account_id/refresh',
        func: (req, res, cb) => {
          redis.rpush('fhQueue', JSON.stringify({
            account_id: req.params.account_id || '1',
          }), (err, length) => {
            if (err) {
              return cb(err);
            }
            return res.json({
              length,
            });
          });
        },
      },
    },
    '/proPlayers': {
      get: {
        summary: 'GET /proPlayers',
        description: 'Get list of pro players',
        tags: ['pro players'],
        responses: {
          200: {
            description: 'Success',
            schema: playerObject,
          },
        },
        route: () => '/proPlayers',
        func: (req, res, cb) => {
          db.select()
            .from('players')
            .rightJoin('notable_players', 'players.account_id', 'notable_players.account_id')
            .orderBy('notable_players.account_id', 'asc')
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result);
            });
        },
      },
    },
    '/proMatches': {
      get: {
        summary: 'GET /proMatches',
        description: 'Get list of pro matches',
        tags: ['pro matches'],
        parameters: [
          params.lessThanMatchIdParam,
        ],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: matchObject,
            },
          },
        },
        route: () => '/proMatches',
        func: (req, res, cb) => {
          db.raw(`
          SELECT match_id, duration, start_time,
          radiant_team_id, radiant.name as radiant_name,
          dire_team_id, dire.name as dire_name,
          leagueid, leagues.name as league_name,
          series_id, series_type,
          radiant_score, dire_score,
          radiant_win
          FROM matches
          LEFT JOIN teams radiant
          ON radiant.team_id = matches.radiant_team_id
          LEFT JOIN teams dire
          ON dire.team_id = matches.dire_team_id
          LEFT JOIN leagues USING(leagueid)
          WHERE match_id < ?
          ORDER BY match_id DESC
          LIMIT 100
          `, [req.query.less_than_match_id || Number.MAX_SAFE_INTEGER])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
      },
    },
    '/publicMatches': {
      get: {
        summary: 'GET /publicMatches',
        description: 'Get list of randomly sampled public matches',
        tags: ['public matches'],
        parameters: [
          params.mmrAscendingParam,
          params.mmrDescendingParam,
          params.lessThanMatchIdParam,
        ],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  match_id: {
                    description: 'match_id',
                    type: 'integer',
                  },
                  match_seq_num: {
                    description: 'match_seq_num',
                    type: 'integer',
                  },
                  radiant_win: properties.radiant_win,
                  start_time: {
                    description: 'start_time',
                    type: 'integer',
                  },
                  duration: properties.duration,
                  radiant_team: {
                    description: 'radiant_team',
                    type: 'string',
                  },
                  dire_team: {
                    description: 'dire_team',
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        route: () => '/publicMatches',
        func: (req, res, cb) => {
          const lessThan = Number(req.query.less_than_match_id) || Number.MAX_SAFE_INTEGER;
          let moreThan = lessThan - 1000000;
          let order = '';
          if (req.query.mmr_ascending) {
            order = 'ORDER BY avg_rank_tier ASC NULLS LAST';
          } else if (req.query.mmr_descending) {
            order = 'ORDER BY avg_rank_tier DESC NULLS LAST';
          } else {
            order = 'ORDER BY match_id DESC';
            moreThan = 0;
          }
          db.raw(`
          WITH match_ids AS (SELECT match_id FROM public_matches
          WHERE TRUE
          AND match_id > ?
          AND match_id < ?
          ${order}
          LIMIT 100)
          SELECT * FROM
          (SELECT * FROM public_matches
          WHERE match_id IN (SELECT match_id FROM match_ids)) matches
          JOIN
          (SELECT match_id, string_agg(hero_id::text, ',') radiant_team FROM public_player_matches WHERE match_id IN (SELECT match_id FROM match_ids) AND player_slot <= 127 GROUP BY match_id) radiant_team
          USING(match_id)
          JOIN
          (SELECT match_id, string_agg(hero_id::text, ',') dire_team FROM public_player_matches WHERE match_id IN (SELECT match_id FROM match_ids) AND player_slot > 127 GROUP BY match_id) dire_team
          USING(match_id)
          ${order}
          `, [moreThan, lessThan])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
      },
    },
    '/parsedMatches': {
      get: {
        summary: 'GET /parsedMatches',
        description: 'Get list of parsed match IDs',
        tags: ['parsed matches'],
        parameters: [
          params.lessThanMatchIdParam,
        ],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  match_id: {
                    description: 'match_id',
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
        route: () => '/parsedMatches',
        func: (req, res, cb) => {
          const lessThan = req.query.less_than_match_id || Number.MAX_SAFE_INTEGER;

          db.raw(`
          SELECT * FROM parsed_matches
          WHERE match_id < ?
          ORDER BY match_id DESC
          LIMIT 100
          `, [lessThan])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
      },
    },
    '/explorer': {
      get: {
        summary: 'GET /explorer',
        description: 'Submit arbitrary SQL queries to the database',
        tags: ['explorer'],
        parameters: [{
          name: 'sql',
          in: 'query',
          description: 'The PostgreSQL query as percent-encoded string.',
          required: false,
          type: 'string',
        }],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
            },
          },
        },
        route: () => '/explorer',
        func: async (req, res) => {
          // TODO handle NQL (@nicholashh query language)
          const input = req.query.sql;
          const client = new Client({
            connectionString: config.READONLY_POSTGRES_URL,
            statement_timeout: 10000,
          });
          client.connect();
          let result = null;
          let err = null;
          try {
            result = await client.query(input);
          } catch (e) {
            err = e;
          }
          client.end();
          const final = Object.assign({}, result, {
            err: err && err.toString(),
          });
          return res.status(err ? 400 : 200).json(final);
        },
      },
    },
    '/metadata': {
      get: {
        summary: 'GET /metadata',
        description: 'Site metadata',
        tags: [
          'metadata',
        ],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                banner: {
                  description: 'banner',
                  type: 'object',
                },
                cheese: {
                  description: 'cheese',
                  type: 'object',
                  properties: {
                    cheese: {
                      description: 'cheese',
                      type: 'string',
                    },
                    goal: {
                      description: 'goal',
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
        route: () => '/metadata',
        func: (req, res, cb) => {
          queries.getMetadata(req, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result);
          });
        },
      },
    },
    '/distributions': {
      get: {
        summary: 'GET /distributions',
        description: 'Distributions of MMR data by bracket and country',
        tags: [
          'distributions',
        ],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                ranks: {
                  description: 'ranks',
                  type: 'object',
                  properties: {
                    commmand: {
                      description: 'command',
                      type: 'string',
                    },
                    rowCount: {
                      description: 'rowCount',
                      type: 'integer',
                    },
                    rows: {
                      description: 'rows',
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          bin: {
                            description: 'bin',
                            type: 'integer',
                          },
                          bin_name: {
                            description: 'bin_name',
                            type: 'integer',
                          },
                          count: {
                            description: 'count',
                            type: 'integer',
                          },
                          cumulative_sum: {
                            description: 'cumulative_sum',
                            type: 'integer',
                          },
                        },
                      },
                    },
                    fields: {
                      description: 'fields',
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: {
                            description: 'name',
                            type: 'string',
                          },
                          tableID: {
                            description: 'tableID',
                            type: 'integer',
                          },
                          columnID: {
                            description: 'columnID',
                            type: 'integer',
                          },
                          dataTypeID: {
                            description: 'dataTypeID',
                            type: 'integer',
                          },
                          dataTypeSize: {
                            description: 'dataTypeSize',
                            type: 'integer',
                          },
                          dataTypeModifier: {
                            description: 'dataTypeModifier',
                            type: 'string',
                          },
                          format: {
                            description: 'format',
                            type: 'string',
                          },
                        },
                      },
                    },
                    rowAsArray: {
                      description: 'rowAsArray',
                      type: 'boolean',
                    },
                    sum: {
                      description: 'sum',
                      type: 'object',
                      properties: {
                        count: {
                          description: 'count',
                          type: 'integer',
                        },
                      },
                    },
                  },
                },
                mmr: {
                  description: 'mmr',
                  type: 'object',
                  properties: {
                    commmand: {
                      description: 'command',
                      type: 'string',
                    },
                    rowCount: {
                      description: 'rowCount',
                      type: 'integer',
                    },
                    rows: {
                      description: 'rows',
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          bin: {
                            description: 'bin',
                            type: 'integer',
                          },
                          bin_name: {
                            description: 'bin_name',
                            type: 'integer',
                          },
                          count: {
                            description: 'count',
                            type: 'integer',
                          },
                          cumulative_sum: {
                            description: 'cumulative_sum',
                            type: 'integer',
                          },
                        },
                      },
                    },
                    fields: {
                      description: 'fields',
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: {
                            description: 'name',
                            type: 'string',
                          },
                          tableID: {
                            description: 'tableID',
                            type: 'integer',
                          },
                          columnID: {
                            description: 'columnID',
                            type: 'integer',
                          },
                          dataTypeID: {
                            description: 'dataTypeID',
                            type: 'integer',
                          },
                          dataTypeSize: {
                            description: 'dataTypeSize',
                            type: 'integer',
                          },
                          dataTypeModifier: {
                            description: 'dataTypeModifier',
                            type: 'string',
                          },
                          format: {
                            description: 'format',
                            type: 'string',
                          },
                        },
                      },
                    },
                    rowAsArray: {
                      description: 'rowAsArray',
                      type: 'boolean',
                    },
                    sum: {
                      description: 'sum',
                      type: 'object',
                      properties: {
                        count: {
                          description: 'count',
                          type: 'integer',
                        },
                      },
                    },
                  },
                },
                country_mmr: {
                  description: 'country_mmr',
                  type: 'object',
                  properties: {
                    commmand: {
                      description: 'command',
                      type: 'string',
                    },
                    rowCount: {
                      description: 'rowCount',
                      type: 'integer',
                    },
                    rows: {
                      description: 'rows',
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          loccountrycode: {
                            description: 'loccountrycode',
                            type: 'string',
                          },
                          count: {
                            description: 'count',
                            type: 'integer',
                          },
                          avg: {
                            description: 'avg',
                            type: 'string',
                          },
                          common: {
                            description: 'common',
                            type: 'string',
                          },
                        },
                      },
                    },
                    fields: {
                      description: 'fields',
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: {
                            description: 'name',
                            type: 'string',
                          },
                          tableID: {
                            description: 'tableID',
                            type: 'integer',
                          },
                          columnID: {
                            description: 'columnID',
                            type: 'integer',
                          },
                          dataTypeID: {
                            description: 'dataTypeID',
                            type: 'integer',
                          },
                          dataTypeSize: {
                            description: 'dataTypeSize',
                            type: 'integer',
                          },
                          dataTypeModifier: {
                            description: 'dataTypeModifier',
                            type: 'integer',
                          },
                          format: {
                            description: 'format',
                            type: 'string',
                          },
                        },
                      },
                    },
                    rowAsArray: {
                      description: 'rowAsArray',
                      type: 'boolean',
                    },
                  },
                },
              },
            },
          },
        },
        route: () => '/distributions',
        func: (req, res, cb) => {
          queries.getDistributions(redis, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result);
          });
        },
      },
    },
    '/search': {
      get: {
        summary: 'GET /search',
        description: 'Search players by personaname.',
        tags: [
          'search',
        ],
        parameters: [{
          name: 'q',
          in: 'query',
          description: 'Search string',
          required: true,
          type: 'string',
        }],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  account_id: {
                    description: 'account_id',
                    type: 'integer',
                  },
                  avatarfull: {
                    description: 'avatarfull',
                    type: 'string',
                  },
                  personaname: {
                    description: 'personaname',
                    type: 'string',
                  },
                  last_match_time: {
                    description: 'last_match_time. May not be present or null.',
                    type: 'string',
                  },
                  similarity: {
                    description: 'similarity',
                    type: 'number',
                  },
                },
              },
            },
          },
        },
        route: () => '/search',
        func: (req, res, cb) => {
          if (!req.query.q) {
            return res.status(400).json([]);
          }

          if (req.query.es || utility.checkIfInExperiment(res.locals.ip, config.ES_SEARCH_PERCENT)) {
            return searchES(req.query, (err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result);
            });
          }
          return search(req.query, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result);
          });
        },
      },
    },
    '/rankings': {
      get: {
        summary: 'GET /rankings',
        description: 'Top players by hero',
        tags: [
          'rankings',
        ],
        parameters: [{
          name: 'hero_id',
          in: 'query',
          description: 'Hero ID',
          required: true,
          type: 'string',
        }],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                hero_id: {
                  description: 'The ID value of the hero played',
                  type: 'integer',
                },
                rankings: {
                  description: 'rankings',
                  type: 'object',
                  properties: {
                    account_id: {
                      description: 'account_id',
                      type: 'integer',
                    },
                    score: {
                      description: 'score',
                      type: 'string',
                    },
                    steamid: {
                      description: 'steamid',
                      type: 'string',
                    },
                    avatar: {
                      description: 'avatar',
                      type: 'string',
                    },
                    avatarmedium: {
                      description: 'avatarmedium',
                      type: 'string',
                    },
                    avatarfull: {
                      description: 'avatarfull',
                      type: 'string',
                    },
                    profileurl: {
                      description: 'profileurl',
                      type: 'string',
                    },
                    personaname: {
                      description: 'personaname',
                      type: 'string',
                    },
                    last_login: {
                      description: 'last_login',
                      type: 'dateTime',
                    },
                    full_history_time: {
                      description: 'full_history_time',
                      type: 'dateTime',
                    },
                    cheese: {
                      description: 'cheese',
                      type: 'integer',
                    },
                    fh_unavailable: {
                      description: 'fh_unavailable',
                      type: 'boolean',
                    },
                    loccountrycode: {
                      description: 'loccountrycode',
                      type: 'string',
                    },
                    rank_tier: {
                      description: 'rank_tier',
                      type: 'integer',
                    },
                  },
                },
              },
            },
          },
        },
        route: () => '/rankings',
        func: (req, res, cb) => {
          queries.getHeroRankings(db, redis, req.query.hero_id, {}, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result);
          });
        },
      },
    },
    '/benchmarks': {
      get: {
        summary: 'GET /benchmarks',
        description: 'Benchmarks of average stat values for a hero',
        tags: [
          'benchmarks',
        ],
        parameters: [{
          name: 'hero_id',
          in: 'query',
          description: 'Hero ID',
          required: true,
          type: 'string',
        }],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                hero_id: {
                  description: 'The ID value of the hero played',
                  type: 'integer',
                },
                result: {
                  description: 'result',
                  type: 'object',
                  properties: {
                    gold_per_min: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          percentile: {
                            description: 'percentile',
                            type: 'number',
                          },
                          value: {
                            description: 'value',
                            type: 'integer',
                          },
                        },
                      },
                    },
                    xp_per_min: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          percentile: {
                            description: 'percentile',
                            type: 'number',
                          },
                          value: {
                            description: 'value',
                            type: 'integer',
                          },
                        },
                      },
                    },
                    kills_per_min: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          percentile: {
                            description: 'percentile',
                            type: 'number',
                          },
                          value: {
                            description: 'value',
                            type: 'integer',
                          },
                        },
                      },
                    },
                    last_hits_per_min: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          percentile: {
                            description: 'percentile',
                            type: 'number',
                          },
                          value: {
                            description: 'value',
                            type: 'integer',
                          },
                        },
                      },
                    },
                    hero_damage_per_min: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          percentile: {
                            description: 'percentile',
                            type: 'number',
                          },
                          value: {
                            description: 'value',
                            type: 'integer',
                          },
                        },
                      },
                    },
                    hero_healing_per_min: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          percentile: {
                            description: 'percentile',
                            type: 'number',
                          },
                          value: {
                            description: 'value',
                            type: 'integer',
                          },
                        },
                      },
                    },
                    tower_damage: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          percentile: {
                            description: 'percentile',
                            type: 'number',
                          },
                          value: {
                            description: 'value',
                            type: 'integer',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        route: () => '/benchmarks',
        func: (req, res, cb) => {
          queries.getHeroBenchmarks(db, redis, {
            hero_id: req.query.hero_id,
          }, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result);
          });
        },
      },
    },
    '/status': {
      get: {
        summary: 'GET /status',
        description: 'Get current service statistics',
        tags: ['status'],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
            },
          },
        },
        route: () => '/status',
        func: (req, res, cb) => {
          buildStatus(db, redis, (err, status) => {
            if (err) {
              return cb(err);
            }
            return res.json(status);
          });
        },
      },
    },
    '/health': {
      get: {
        summary: 'GET /health',
        description: 'Get service health data',
        tags: ['health'],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
            },
          },
        },
        route: () => '/health/:metric?',
        func: (req, res, cb) => {
          redis.hgetall('health', (err, result) => {
            if (err) {
              return cb(err);
            }
            const response = result || {};
            Object.keys(response).forEach((key) => {
              response[key] = JSON.parse(response[key]);
            });
            if (!req.params.metric) {
              return res.json(response);
            }
            const single = response[req.params.metric];
            const healthy = single.metric < single.threshold;
            return res.status(healthy ? 200 : 500).json(single);
          });
        },
      },
    },
    '/request/{jobId}': {
      get: {
        summary: 'GET /request/{jobId}',
        description: 'Get parse request state',
        tags: ['request'],
        parameters: [{
          name: 'jobId',
          in: 'path',
          description: 'The job ID to query.',
          required: true,
          type: 'string',
        }],
        route: () => '/request/:jobId',
        func: (req, res, cb) => {
          queue.getJob(req.params.jobId, (err, job) => {
            if (err) {
              return cb(err);
            }
            if (job) {
              return res.json(Object.assign({}, job, {
                jobId: job.id,
              }));
            }
            return res.json(null);
          });
        },
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
            },
          },
        },
      },
    },
    '/request/{match_id}': {
      post: {
        summary: 'POST /request/{match_id}',
        description: 'Submit a new parse request',
        tags: ['request'],
        parameters: [{
          name: 'match_id',
          in: 'path',
          required: true,
          type: 'integer',
        }],
        route: () => '/request/:match_id',
        func: (req, res) => {
          const matchId = req.params.match_id;
          const match = {
            match_id: Number(matchId),
          };
          function exitWithJob(err, parseJob) {
            if (err) {
              console.error(err);
            }
            res.status(err ? 400 : 200).json({
              job: {
                jobId: parseJob && parseJob.id,
              },
            });
          }
          if (match && match.match_id) {
            // match id request, get data from API
            return utility.getData(utility.generateJob('api_details', match).url, (err, body) => {
              if (err) {
                // couldn't get data from api, non-retryable
                return exitWithJob(JSON.stringify(err));
              }
              // Count this request
              redisCount(redis, 'request');
              // match details response
              const match = body.result;
              return queries.insertMatch(match, {
                type: 'api',
                attempts: 1,
                priority: 1,
                forceParse: true,
              }, exitWithJob);
            });
          }
          return exitWithJob('invalid input');
        },
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
            },
          },
        },
      },
    },
    '/findMatches': {
      get: {
        summary: 'GET /',
        description: 'Finds recent matches by heroes played',
        tags: ['findMatches'],
        parameters: [{
          name: 'teamA',
          in: 'query',
          description: 'Hero IDs on first team (array)',
          required: false,
          type: 'integer',
        }, {
          name: 'teamB',
          in: 'query',
          description: 'Hero IDs on second team (array)',
          required: false,
          type: 'integer',
        }],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
            },
          },
        },
        route: () => '/findMatches',
        func: (req, res, cb) => {
          // accept as input two arrays of up to 5
          const t0 = [].concat(req.query.teamA || []).slice(0, 5);
          const t1 = [].concat(req.query.teamB || []).slice(0, 5);

          // Construct key for redis
          const key = `combos:${matchupToString(t0, t1, true)}`;
          redis.get(key, (err, reply) => {
            if (err) {
              return cb(err);
            }
            if (reply) {
              return res.end(reply);
            }
            // Determine which comes first
            // const rcg = groupToString(t0);
            // const dcg = groupToString(t1);

            // const inverted = rcg > dcg;
            const inverted = false;
            const teamA = inverted ? t1 : t0;
            const teamB = inverted ? t0 : t1;

            return db.raw('select * from hero_search where (teamA @> ? AND teamB @> ?) OR (teamA @> ? AND teamB @> ?) order by match_id desc limit 10', [teamA, teamB, teamB, teamA]).asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              redis.setex(key, 60, JSON.stringify(result.rows));
              return res.json(result.rows);
            });
          });
        },
      },
    },
    /*
    '/matchups': {
      get: {
        summary: 'GET /',
        description: 'Get hero matchups (teammates and opponents)',
        tags: ['matchups'],
        parameters: [{
          name: 't0',
          in: 'query',
          description: 'Hero 0 ID',
          required: false,
          type: 'integer',
        }, {
          name: 't1',
          in: 'query',
          description: 'Hero 1 ID',
          required: false,
          type: 'integer',
        }],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
            },
          },
        },
        route: () => '/matchups',
        func: (req, res, cb) => {
          // accept as input two arrays of up to 5
          const t0 = [].concat(req.query.t0 || []).slice(0, 5);
          const t1 = [].concat(req.query.t1 || []).slice(0, 5);
          // return wins of each team
          async.parallel({
            t0(cb) {
              redis.hget('matchups', utility.matchupToString(t0, t1, true), cb);
            },
            t1(cb) {
              redis.hget('matchups', utility.matchupToString(t0, t1, false), cb);
            },
          }, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json({
              t0: Number(result.t0) || 0,
              t1: Number(result.t1) || 0,
            });
          });
        },
      },
    },
    */
    '/heroes': {
      get: {
        summary: 'GET /heroes',
        description: 'Get hero data',
        tags: ['heroes'],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: heroObject,
            },
          },
        },
        route: () => '/heroes',
        func: (req, res, cb) => {
          db.select()
            .from('heroes')
            .orderBy('id', 'asc')
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result);
            });
        },
      },
    },
    '/heroStats': {
      get: {
        summary: 'GET /heroStats',
        description: 'Get stats about hero performance in recent matches',
        tags: ['hero stats'],
        parameters: [],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    description: 'id',
                    type: 'integer',
                  },
                  name: {
                    description: 'name',
                    type: 'string',
                  },
                  localized_name: {
                    description: 'localized_name',
                    type: 'string',
                  },
                  img: {
                    description: 'img',
                    type: 'string',
                  },
                  icon: {
                    description: 'icon',
                    type: 'string',
                  },
                  pro_win: {
                    description: 'pro_win',
                    type: 'integer',
                  },
                  pro_pick: {
                    description: 'pro_pick',
                    type: 'integer',
                  },
                  hero_id: {
                    description: 'The ID value of the hero played',
                    type: 'integer',
                  },
                  pro_ban: {
                    description: 'pro_ban',
                    type: 'integer',
                  },
                  '1_pick': {
                    description: 'Herald picks',
                    type: 'integer',
                  },
                  '1_win': {
                    description: 'Herald wins',
                    type: 'integer',
                  },
                  '2_pick': {
                    description: 'Guardian picks',
                    type: 'integer',
                  },
                  '2_win': {
                    description: 'Guardian wins',
                    type: 'integer',
                  },
                  '3_pick': {
                    description: 'Crusader picks',
                    type: 'integer',
                  },
                  '3_win': {
                    description: 'Crusader wins',
                    type: 'integer',
                  },
                  '4_pick': {
                    description: 'Archon picks',
                    type: 'integer',
                  },
                  '4_win': {
                    description: 'Archon wins',
                    type: 'integer',
                  },
                  '5_pick': {
                    description: 'Legend picks',
                    type: 'integer',
                  },
                  '5_win': {
                    description: 'Legend wins',
                    type: 'integer',
                  },
                  '6_pick': {
                    description: 'Ancient picks',
                    type: 'integer',
                  },
                  '6_win': {
                    description: 'Ancient wins',
                    type: 'integer',
                  },
                  '7_pick': {
                    description: 'Divine picks',
                    type: 'integer',
                  },
                  '7_win': {
                    description: 'Divine wins',
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
        route: () => '/heroStats',
        func: (req, res, cb) => {
          // fetch from cached redis value
          redis.get('heroStats', (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(JSON.parse(result));
          });
        },
      },
    },
    '/heroes/{hero_id}/matches': {
      get: {
        summary: 'GET /heroes/{hero_id}/matches',
        description: 'Get recent matches with a hero',
        tags: ['heroes'],
        parameters: [params.heroIdPathParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: matchObject,
            },
          },
        },
        route: () => '/heroes/:hero_id/matches',
        func: (req, res, cb) => {
          const heroId = req.params.hero_id;
          db.raw(`SELECT
            matches.match_id,
            matches.start_time,
            matches.duration,
            matches.radiant_win,
            matches.leagueid,
            leagues.name as league_name,
            ((player_matches.player_slot < 128) = matches.radiant_win) radiant,
            player_matches.player_slot,
            player_matches.account_id,
            player_matches.kills,
            player_matches.deaths,
            player_matches.assists
            FROM matches
            JOIN player_matches using(match_id)
            JOIN leagues using(leagueid)
            LEFT JOIN heroes on heroes.id = player_matches.hero_id
            WHERE player_matches.hero_id = ?
            ORDER BY matches.match_id DESC
            LIMIT 100`, [heroId])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
      },
    },
    '/heroes/{hero_id}/matchups': {
      get: {
        summary: 'GET /heroes/{hero_id}/matchups',
        description: 'Get results against other heroes for a hero',
        tags: ['heroes'],
        parameters: [params.heroIdPathParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  hero_id: {
                    description: 'Numeric identifier for the hero object',
                    type: 'integer',
                  },
                  games_played: {
                    description: 'Number of games played',
                    type: 'integer',
                  },
                  wins: {
                    description: 'Number of games won',
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
        route: () => '/heroes/:hero_id/matchups',
        func: (req, res, cb) => {
          const heroId = req.params.hero_id;
          db.raw(`SELECT
            pm2.hero_id,
            count(player_matches.match_id) games_played,
            sum(case when (player_matches.player_slot < 128) = matches.radiant_win then 1 else 0 end) wins
            FROM matches
            JOIN player_matches using(match_id)
            JOIN player_matches pm2 on player_matches.match_id = pm2.match_id AND (player_matches.player_slot < 128) != (pm2.player_slot < 128)
            WHERE player_matches.hero_id = ?
            AND matches.start_time > ?
            GROUP BY pm2.hero_id
            ORDER BY games_played DESC`, [heroId, moment().subtract(1, 'year').format('X')])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
      },
    },
    '/heroes/{hero_id}/durations': {
      get: {
        summary: 'GET /heroes/{hero_id}/durations',
        description: 'Get hero performance over a range of match durations',
        tags: ['heroes'],
        parameters: [params.heroIdPathParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  duration_bin: {
                    description: 'Lower bound of number of seconds the match lasted',
                    type: 'string',
                  },
                  games_played: {
                    description: 'Number of games played',
                    type: 'integer',
                  },
                  wins: {
                    description: 'Number of wins',
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
        route: () => '/heroes/:hero_id/durations',
        func: (req, res, cb) => {
          const heroId = req.params.hero_id;
          db.raw(`SELECT
            (matches.duration / 300 * 300) duration_bin,
            count(match_id) games_played,
            sum(case when (player_matches.player_slot < 128) = matches.radiant_win then 1 else 0 end) wins
            FROM matches
            JOIN player_matches using(match_id)
            WHERE player_matches.hero_id = ?
            GROUP BY (matches.duration / 300 * 300)`, [heroId])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
      },
    },
    '/heroes/{hero_id}/players': {
      get: {
        summary: 'GET /heroes/{hero_id}/players',
        description: 'Get players who have played this hero',
        tags: ['heroes'],
        parameters: [params.heroIdPathParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: playerObject,
            },
          },
        },
        route: () => '/heroes/:hero_id/players',
        func: (req, res, cb) => {
          const heroId = req.params.hero_id;
          db.raw(`SELECT
            account_id,
            count(match_id) games_played,
            sum(case when (player_matches.player_slot < 128) = matches.radiant_win then 1 else 0 end) wins
            FROM matches
            JOIN player_matches using(match_id)
            WHERE player_matches.hero_id = ?
            GROUP BY account_id
            ORDER BY games_played DESC`, [heroId])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
      },
    },
    '/heroes/{hero_id}/itemPopularity': {
      get: {
        summary: 'GET /heroes/{hero_id}/itemPopularity',
        description: 'Get item popularity of hero categoried by start, early, mid and late game, analyzed from professional games',
        tags: ['heroes'],
        parameters: [params.heroIdPathParam],
        route: () => '/heroes/:hero_id/itemPopularity',
        func: (req, res, cb) => {
          const heroId = req.params.hero_id;
          queries.getHeroItemPopularity(db, redis, heroId, {}, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result);
          });
        },
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                start_game_items: {
                  description: 'Items bought before game started',
                  type: 'object',
                  properties: {
                    item: {
                      description: 'Number of item bought',
                      type: 'integer',
                    },
                  },
                },
                early_game_items: {
                  description: 'Items bought in the first 10 min of the game, with cost at least 700',
                  type: 'object',
                  properties: {
                    item: {
                      description: 'Number of item bought',
                      type: 'integer',
                    },
                  },
                },
                mid_game_items: {
                  description: 'Items bought between 10 and 25 min of the game, with cost at least 2000',
                  type: 'object',
                  properties: {
                    item: {
                      description: 'Number of item bought',
                      type: 'integer',
                    },
                  },
                },
                late_game_items: {
                  description: 'Items bought at least 25 min after game started, with cost at least 4000',
                  type: 'object',
                  properties: {
                    item: {
                      description: 'Number of item bought',
                      type: 'integer',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/leagues': {
      get: {
        summary: 'GET /leagues',
        description: 'Get league data',
        tags: ['leagues'],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  leagueid: {
                    description: 'leagueid',
                    type: 'integer',
                  },
                  ticket: {
                    description: 'ticket',
                    type: 'string',
                  },
                  banner: {
                    description: 'banner',
                    type: 'string',
                  },
                  tier: {
                    description: 'tier',
                    type: 'string',
                  },
                  name: {
                    description: 'name',
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        route: () => '/leagues',
        func: (req, res, cb) => {
          db.select()
            .from('leagues')
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result);
            });
        },
      },
    },
    '/teams': {
      get: {
        summary: 'GET /teams',
        description: 'Get team data',
        tags: ['teams'],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: teamObject,
            },
          },
        },
        route: () => '/teams',
        func: (req, res, cb) => {
          db.raw(`SELECT team_rating.*, teams.*
            FROM teams
            LEFT JOIN team_rating using(team_id)
            ORDER BY rating desc NULLS LAST
            LIMIT 1000`)
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
      },
    },
    '/teams/{team_id}': {
      get: {
        summary: 'GET /teams/{team_id}',
        description: 'Get data for a team',
        tags: ['teams'],
        parameters: [params.teamIdPathParam],
        responses: {
          200: {
            description: 'Success',
            schema: teamObject,
          },
        },
        route: () => '/teams/:team_id',
        func: (req, res, cb) => {
          db.raw(`SELECT team_rating.*, teams.*
            FROM teams
            LEFT JOIN team_rating using(team_id)
            WHERE teams.team_id = ?`, [req.params.team_id])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows[0]);
            });
        },
      },
    },
    '/teams/{team_id}/matches': {
      get: {
        summary: 'GET /teams/{team_id}/matches',
        description: 'Get matches for a team',
        tags: ['teams'],
        parameters: [params.teamIdPathParam],
        responses: {
          200: {
            description: 'Success',
            schema: matchObject,
          },
        },
        route: () => '/teams/:team_id/matches',
        func: (req, res, cb) => {
          db.raw(`
            SELECT team_match.match_id, radiant_win, team_match.radiant, duration, start_time, leagueid, leagues.name as league_name, cluster, tm2.team_id opposing_team_id, teams2.name opposing_team_name, teams2.logo_url opposing_team_logo
            FROM team_match
            JOIN matches USING(match_id)
            JOIN leagues USING(leagueid)
            JOIN team_match tm2 on team_match.match_id = tm2.match_id and team_match.team_id != tm2.team_id
            JOIN teams teams2 on tm2.team_id = teams2.team_id
            WHERE team_match.team_id = ?
            ORDER BY match_id DESC
            `, [req.params.team_id])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
      },
    },
    '/teams/{team_id}/players': {
      get: {
        summary: 'GET /teams/{team_id}/players',
        description: 'Get players who have played for a team',
        tags: ['teams'],
        parameters: [params.teamIdPathParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                account_id: {
                  description: 'The player account ID',
                  type: 'string',
                },
                name: {
                  description: 'The player name',
                  type: 'string',
                },
                games_played: {
                  description: 'Number of games played',
                  type: 'integer',
                },
                wins: {
                  description: 'Number of wins',
                  type: 'integer',
                },
                is_current_team_member: {
                  description: 'If this player is on the current roster',
                  type: 'boolean',
                },
              },
            },
          },
        },
        route: () => '/teams/:team_id/players',
        func: (req, res, cb) => {
          db.raw(`SELECT account_id, notable_players.name, count(matches.match_id) games_played, sum(case when (player_matches.player_slot < 128) = matches.radiant_win then 1 else 0 end) wins, notable_players.team_id = teams.team_id is_current_team_member
            FROM matches
            JOIN team_match USING(match_id)
            JOIN player_matches ON player_matches.match_id = matches.match_id AND team_match.radiant = (player_matches.player_slot < 128)
            JOIN teams USING (team_id)
            LEFT JOIN notable_players USING(account_id)
            WHERE teams.team_id = ?
            GROUP BY account_id, notable_players.name, notable_players.team_id, teams.team_id
            ORDER BY games_played DESC`, [req.params.team_id])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
      },
    },
    '/teams/{team_id}/heroes': {
      get: {
        summary: 'GET /teams/{team_id}/heroes',
        description: 'Get heroes for a team',
        tags: ['teams'],
        parameters: [params.teamIdPathParam],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'object',
              properties: {
                hero_id: {
                  description: 'The hero ID',
                  type: 'integer',
                },
                name: {
                  description: 'The hero name',
                  type: 'string',
                },
                games_played: {
                  description: 'Number of games played',
                  type: 'integer',
                },
                wins: {
                  description: 'Number of wins',
                  type: 'integer',
                },
              },
            },
          },
        },
        route: () => '/teams/:team_id/heroes',
        func: (req, res, cb) => {
          db.raw(`SELECT hero_id, localized_name, count(matches.match_id) games_played, sum(case when (player_matches.player_slot < 128) = matches.radiant_win then 1 else 0 end) wins
            FROM matches
            JOIN team_match USING(match_id)
            JOIN player_matches ON player_matches.match_id = matches.match_id AND team_match.radiant = (player_matches.player_slot < 128)
            JOIN teams USING(team_id)
            LEFT JOIN heroes ON player_matches.hero_id = heroes.id
            WHERE teams.team_id = ?
            GROUP BY hero_id, localized_name
            ORDER BY games_played DESC`, [req.params.team_id])
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result.rows);
            });
        },
      },
    },
    '/replays': {
      get: {
        summary: 'GET /replays',
        description: 'Get data to construct a replay URL with',
        tags: ['replays'],
        parameters: [{
          name: 'match_id',
          in: 'query',
          description: 'Match IDs (array)',
          required: true,
          type: 'integer',
        }],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  match_id: {
                    description: 'match_id',
                    type: 'integer',
                  },
                  cluster: {
                    description: 'cluster',
                    type: 'integer',
                  },
                  replay_salt: {
                    description: 'replay_salt',
                    type: 'integer',
                  },
                },
              },
            },
          },
        },
        route: () => '/replays',
        func: (req, res, cb) => {
          db.select(['match_id', 'cluster', 'replay_salt'])
            .from('match_gcdata')
            .whereIn('match_id', [].concat(req.query.match_id || []).slice(0, 5))
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result);
            });
          /*
          async.map(
            [].concat(req.query.match_id || []).slice(0, 5),
            (matchId, cb) => getGcData({
              match_id: matchId,
              noRetry: true,
              allowBackup: true,
            }, (err, result) => {
              if (err) {
                // Don't log this to avoid filling the output
              }
              return cb(null, result);
            }),
            (err, result) => {
              if (err) {
                return cb(err);
              }
              const final = result.filter(Boolean);
              return res.json(final);
            },
          );
          */
        },
      },
    },
    '/records/{field}': {
      get: {
        summary: 'GET /records/{field}',
        description: 'Get top performances in a stat',
        tags: ['records'],
        parameters: [{
          name: 'field',
          in: 'path',
          description: 'Field name to query',
          required: true,
          type: 'string',
        }],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  match_id: {
                    description: 'match_id',
                    type: 'integer',
                  },
                  start_time: {
                    description: 'start_time',
                    type: 'integer',
                  },
                  hero_id: {
                    description: 'The ID value of the hero played',
                    type: 'integer',
                  },
                  score: {
                    description: 'score',
                    type: 'number',
                  },
                },
              },
            },
          },
        },
        route: () => '/records/:field',
        func: (req, res, cb) => {
          redis.zrevrange(`records:${req.params.field}`, 0, 99, 'WITHSCORES', (err, rows) => {
            if (err) {
              return cb(err);
            }
            const entries = rows.map((r, i) => ({
              match_id: r.split(':')[0],
              start_time: r.split(':')[1],
              hero_id: r.split(':')[2],
              score: rows[i + 1],
            })).filter((r, i) => i % 2 === 0);
            return res.json(entries);
          });
        },
      },
    },
    '/live': {
      get: {
        summary: 'GET /live',
        description: 'Get top currently ongoing live games',
        tags: ['live'],
        parameters: [],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                },
              },
            },
          },
        },
        route: () => '/live',
        func: (req, res, cb) => {
          redis.zrangebyscore('liveGames', '-inf', 'inf', (err, rows) => {
            if (err) {
              return cb(err);
            }
            if (!rows.length) {
              return res.json(rows);
            }
            const keys = rows.map(r => `liveGame:${r}`);
            return redis.mget(keys, (err, rows) => {
              if (err) {
                return cb(err);
              }
              return res.json(rows.map(r => JSON.parse(r)));
            });
          });
        },
      },
    },
    '/scenarios/itemTimings': {
      get: {
        summary: 'GET /scenarios/itemTimings',
        description: `Win rates for certain item timings on a hero for items that cost at least ${su.itemCost} gold`,
        tags: ['scenarios'],
        parameters: [{
          name: 'item',
          in: 'query',
          description: 'Filter by item name e.g. "spirit_vessel"',
          required: false,
          type: 'string',
        },
        params.heroIdParam,
        ],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  hero_id: {
                    description: 'Hero ID',
                    type: 'integer',
                  },
                  item: {
                    description: 'Purchased item',
                    type: 'string',
                  },
                  time: {
                    description: 'Ingame time in seconds before the item was purchased',
                    type: 'integer',
                  },
                  games: {
                    description: 'The number of games where the hero bought this item before this time',
                    type: 'string',
                  },
                  wins: {
                    description: 'The number of games won where the hero bought this item before this time',
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        route: () => '/scenarios/itemTimings',
        func: (req, res, cb) => {
          queries.getItemTimings(req, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result.rows);
          });
        },
      },
    },
    '/scenarios/laneRoles': {
      get: {
        summary: 'GET /scenarios/laneRoles',
        description: 'Win rates for heroes in certain lane roles',
        tags: ['scenarios'],
        parameters: [{
          name: 'lane_role',
          in: 'query',
          description: 'Filter by lane role 1-4 (Safe, Mid, Off, Jungle)',
          required: false,
          type: 'string',
        },
        params.heroIdParam,
        ],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  hero_id: {
                    description: 'Hero ID',
                    type: 'integer',
                  },
                  lane_role: {
                    description: 'The hero\'s lane role',
                    type: 'integer',
                  },
                  time: {
                    description: 'Maximum game length in seconds',
                    type: 'integer',
                  },
                  games: {
                    description: 'The number of games where the hero played in this lane role',
                    type: 'string',
                  },
                  wins: {
                    description: 'The number of games won where the hero played in this lane role',
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        route: () => '/scenarios/laneRoles',
        func: (req, res, cb) => {
          queries.getLaneRoles(req, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result.rows);
          });
        },
      },
    },
    '/scenarios/misc': {
      get: {
        summary: 'GET /scenarios/misc',
        description: 'Miscellaneous team scenarios',
        tags: ['scenarios'],
        parameters: [{
          name: 'scenario',
          in: 'query',
          description: su.teamScenariosQueryParams.toString(),
          required: false,
          type: 'string',
        }],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  scenario: {
                    description: 'The scenario\'s name or description',
                    type: 'string',
                  },
                  is_radiant: {
                    description: 'Boolean indicating whether Radiant executed this scenario',
                    type: 'boolean',
                  },
                  region: {
                    description: 'Region the game was played in',
                    type: 'integer',
                  },
                  games: {
                    description: 'The number of games where this scenario occurred',
                    type: 'string',
                  },
                  wins: {
                    description: 'The number of games won where this scenario occured',
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        route: () => '/scenarios/misc',
        func: (req, res, cb) => {
          queries.getTeamScenarios(req, (err, result) => {
            if (err) {
              return cb(err);
            }
            return res.json(result.rows);
          });
        },
      },
    },
    '/schema': {
      get: {
        summary: 'GET /schema',
        description: 'Get database schema',
        tags: ['schema'],
        parameters: [],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  table_name: {
                    description: 'table_name',
                    type: 'string',
                  },
                  column_name: {
                    description: 'column_name',
                    type: 'string',
                  },
                  data_type: {
                    description: 'data_type',
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        route: () => '/schema',
        func: (req, res, cb) => {
          db.select(['table_name', 'column_name', 'data_type'])
            .from('information_schema.columns')
            .where({
              table_schema: 'public',
            })
            .asCallback((err, result) => {
              if (err) {
                return cb(err);
              }
              return res.json(result);
            });
        },
      },
    },
    '/constants/{resource}': {
      get: {
        summary: 'GET /constants',
        description: 'Get static game data mirrored from the dotaconstants repository. If no resource is specified, returns an array of available resources.',
        tags: ['constants'],
        parameters: [{
          name: 'resource',
          in: 'path',
          description: 'Resource name e.g. `heroes`. [List of resources](https://github.com/odota/dotaconstants/tree/master/build)',
          required: false,
          type: 'string',
        }],
        route: () => '/constants/:resource?',
        func: (req, res, cb) => {
          if (!req.params.resource) {
            return res.json(Object.keys(constants));
          }
          const { resource } = req.params;
          if (resource in constants) {
            return res.json(constants[resource]);
          }
          return cb();
        },
      },
    },
    /*
    '/feed': {
      get: {
        summary: 'GET /feed',
        description: 'Get streaming feed of latest matches as newline-delimited JSON',
        tags: ['feed'],
        parameters: [
          {
            name: 'seq_num',
            in: 'query',
            description: 'Return only matches after this sequence number. If not provided, returns a stream starting at the current time.',
            required: false,
            type: 'number',
          },
          {
            name: 'game_mode',
            in: 'query',
            description: 'Filter to only matches in this game mode',
            required: false,
            type: 'number',
          },
          {
            name: 'leagueid',
            in: 'query',
            description: 'Filter to only matches in this league',
            required: false,
            type: 'number',
          },
          {
            name: 'included_account_id',
            in: 'query',
            description: 'Filter to only matches with this account_id participating',
            required: false,
            type: 'number',
          },
        ],
        responses: {
          200: {
            description: 'Success',
            schema: {
              type: 'array',
              items: matchObject,
            },
          },
        },
        route: () => '/feed',
        func: (req, res, cb) => {
          if (config.NODE_ENV !== 'development' && !res.locals.isAPIRequest) {
            return res.status(403).json({ error: 'API key required' });
          }
          if (!req.query) {
            return res.status(400).json({ error: 'No query string detected' });
          }
          if (!req.query.game_mode && !req.query.leagueid && !req.query.included_account_id) {
            return res.status(400).json({ error: 'A filter parameter is required' });
          }
          // TODO don't allow arrays of parameters
          const keepAlive = setInterval(() => res.write('\n'), 5000);
          req.on('end', () => {
            clearTimeout(keepAlive);
          });
          const readFromStream = (seqNum) => {
            redis.xread('block', '0', 'COUNT', '10', 'STREAMS', 'feed', seqNum, (err, result) => {
              if (err) {
                return cb(err);
              }
              let nextSeqNum = '$';
              result[0][1].forEach((dataArray) => {
                const dataMatch = JSON.parse(dataArray[1]['1']);
                const filters = {
                  game_mode: [Number(req.query.game_mode)],
                  leagueid: [Number(req.query.leagueid)],
                  included_account_id: [Number(req.query.included_account_id)],
                };
                // console.log(filter([dataMatch], filters).length);
                if (filter([dataMatch], filters).length) {
                  const dataSeqNum = dataArray[0];
                  nextSeqNum = dataSeqNum;
                  // This is an array of 2 elements where the first is the sequence number and the second is the stream key-value pairs
                  // Put the sequence number in the match object so client can know where they're at
                  const final = { ...dataMatch, seq_num: dataSeqNum };
                  res.write(`${JSON.stringify(final)}\n`);
                  res.flush();
                  redisCount(redis, 'feed');
                }
              });
              return readFromStream(nextSeqNum);
            });
          };
          return readFromStream(req.query.seq_num || '$');
        },
      },
    },
    */
  },
};
module.exports = spec;
