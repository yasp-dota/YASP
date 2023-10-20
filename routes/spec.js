const packageJson = require("../package.json");
const params = require("./requests/importParams");
const responses = require("./responses/schemas/importResponseSchemas");
const generateOperationId = require("./generateOperationId");
const databaseHandler = require("./handlers/database")
const heroesHandler = require("./handlers/heroes");
const leaguesHandler = require("./handlers/leagues")
const matchesHandler = require("./handlers/matches")
const playersHandler = require("./handlers/players");
const teamsHandler = require("./handlers/teams");

const parameters = Object.values(params).reduce(
  (acc, category) => ({ ...acc, ...category }),
  {}
);

const playerParamNames = [
  "accountIdParam",
  "limitParam",
  "offsetParam",
  "winParam",
  "patchParam",
  "gameModeParam",
  "lobbyTypeParam",
  "regionParam",
  "dateParam",
  "laneRoleParam",
  "heroIdParam",
  "isRadiantParam",
  "includedAccountIdParam",
  "excludedAccountIdParam",
  "withHeroIdParam",
  "againstHeroIdParam",
  "significantParam",
  "havingParam",
  "sortParam",
];

const playerParams = playerParamNames.map((paramName) => ({
  $ref: `#/components/parameters/${paramName}`,
}));

const schemas = Object.values(responses).reduce(
  (acc, category) => ({ ...acc, ...category }),
  {}
);

const securitySchemes = {
  api_key: {
    type: "apiKey",
    name: "api_key",
    description: `Use an API key to remove monthly call limits and to receive higher rate limits. [Learn more and get your API key](https://www.opendota.com/api-keys).
        Usage example: https://api.opendota.com/api/matches/271145478?api_key=YOUR-API-KEY
        
        API key can also be sent using the authorization header "Authorization: Bearer YOUR-API-KEY"
        `,
    in: "query",
  },
};

const spec = {
  openapi: "3.0.3",
  info: {
    title: "OpenDota API",
    description: `# Introduction
The OpenDota API provides Dota 2 related data including advanced match data extracted from match replays.

You can find data that can be used to convert hero and ability IDs and other information provided by the API from the [dotaconstants](https://github.com/odota/dotaconstants) repository.

The OpenDota API offers 50,000 free calls per month and a rate limit of 60 requests/minute. We also offer a Premium Tier with unlimited API calls and higher rate limits. Check out the [API page](https://www.opendota.com/api-keys) to learn more.
    `,
    version: packageJson.version,
  },
  servers: [
    {
      url: "https://api.opendota.com/api",
    },
  ],
  components: {
    securitySchemes: securitySchemes,
    schemas: schemas,
    parameters: parameters,
  },
  paths: {
    "/matches/{match_id}": {
      get: {
        operationId: generateOperationId("get", "/matches/{match_id}"),
        summary: "GET /matches/{match_id}",
        description: "Match data",
        tags: ["matches"],
        parameters: [{ $ref: "#/components/parameters/matchIdParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: "#/components/schemas/MatchResponse",
                },
              },
            },
          },
        },
        route: () => "/matches/:match_id/:info?",
        func: matchesHandler.getMatchById,
      },
    },
    "/playersByRank": {
      get: {
        operationId: generateOperationId("get", "/playersByRank"),
        summary: "GET /playersByRank",
        description: "Players ordered by rank/medal tier",
        tags: ["playersByRank"],
        parameters: [],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: "#/components/schemas/PlayersByRankResponse",
                },
              },
            },
          },
        },
        route: () => "/playersByRank",
        func: playersHandler.getPlayersByRank,
      },
    },
    "/players/{account_id}": {
      get: {
        operationId: generateOperationId("get", "/players/{account_id}"),
        summary: "GET /players/{account_id}",
        description: "Player data",
        tags: ["players"],
        parameters: [{ $ref: "#/components/parameters/accountIdParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: "#/components/schemas/PlayersResponse",
                },
              },
            },
          },
        },
        route: () => "/players/:account_id",
        func: playersHandler.getPlayersByAccountId,
      },
    },
    "/players/{account_id}/wl": {
      get: {
        operationId: generateOperationId("get", "/players/{account_id}/wl"),
        summary: "GET /players/{account_id}/wl",
        description: "Win/Loss count",
        tags: ["players"],
        parameters: playerParams,
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/PlayerWinLossResponse`,
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/wl",
        func: playersHandler.getPlayersByAccountIdWl,
      },
    },
    "/players/{account_id}/recentMatches": {
      get: {
        operationId: generateOperationId(
          "get",
          "/players/{account_id}/recentMatches"
        ),
        summary: "GET /players/{account_id}/recentMatches",
        description: "Recent matches played",
        tags: ["players"],
        parameters: [{ $ref: "#/components/parameters/accountIdParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    items: {
                      $ref: "#/components/schemas/PlayerRecentMatchesResponse",
                    },
                  },
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/recentMatches",
        func: playersHandler.getPlayersByAccountIdRecentMatches,
      },
    },
    "/players/{account_id}/matches": {
      get: {
        operationId: generateOperationId(
          "get",
          "/players/{account_id}/matches"
        ),
        summary: "GET /players/{account_id}/matches",
        description: "Matches played",
        tags: ["players"],
        parameters: [
          ...playerParams,
          {
            $ref: `#/components/parameters/projectParam`,
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/PlayerMatchesResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/matches",
        func: playersHandler.getPlayersByAccountIdMatches,
      },
    },
    "/players/{account_id}/heroes": {
      get: {
        operationId: generateOperationId("get", "/players/{account_id}/heroes"),
        summary: "GET /players/{account_id}/heroes",
        description: "Heroes played",
        tags: ["players"],
        parameters: playerParams,
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/PlayerHeroesResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/heroes",
        func: playersHandler.getPlayersByAccountIdHeroes,
      },
    },
    "/players/{account_id}/peers": {
      get: {
        operationId: generateOperationId("get", "/players/{account_id}/peers"),
        summary: "GET /players/{account_id}/peers",
        description: "Players played with",
        tags: ["players"],
        parameters: playerParams,
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/PlayerPeersResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/peers",
        func: playersHandler.getPlayersByAccountIdPeers,
      },
    },
    "/players/{account_id}/pros": {
      get: {
        operationId: generateOperationId("get", "/players/{account_id}/pros"),
        summary: "GET /players/{account_id}/pros",
        description: "Pro players played with",
        tags: ["players"],
        parameters: playerParams,
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/PlayerProsResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/pros",
        func: playersHandler.getPlayersByAccountIdPros,
      },
    },
    "/players/{account_id}/totals": {
      get: {
        operationId: generateOperationId("get", "/players/{account_id}/totals"),
        summary: "GET /players/{account_id}/totals",
        description: "Totals in stats",
        tags: ["players"],
        parameters: playerParams,
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/PlayerTotalsResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/totals",
        func: playersHandler.getPlayersByAccountIdTotals,
      },
    },
    "/players/{account_id}/counts": {
      get: {
        operationId: generateOperationId("get", "/players/{account_id}/counts"),
        summary: "GET /players/{account_id}/counts",
        description: "Counts in categories",
        tags: ["players"],
        parameters: playerParams,
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: "#/components/schemas/PlayerCountsResponse",
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/counts",
        func: playersHandler.getPlayersByAccountIdCounts,
      },
    },
    "/players/{account_id}/histograms/{field}": {
      get: {
        operationId: generateOperationId(
          "get",
          "/players/{account_id}/histograms/{field}"
        ),
        summary: "GET /players/{account_id}/histograms",
        description: "Distribution of matches in a single stat",
        tags: ["players"],
        parameters: [
          ...playerParams,
          {
            $ref: `#/components/parameters/fieldParam`,
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    title: "PlayerHistogramsResponse",
                    type: "object",
                  },
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/histograms/:field",
        func: playersHandler.getPlayersByAccountIdHistogramsByField,
      },
    },
    "/players/{account_id}/wardmap": {
      get: {
        operationId: generateOperationId(
          "get",
          "/players/{account_id}/wardmap"
        ),
        summary: "GET /players/{account_id}/wardmap",
        description: "Wards placed in matches played",
        tags: ["players"],
        parameters: playerParams,
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/PlayerWardMapResponse`,
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/wardmap",
        func: playersHandler.getPlayersByAccountIdWardMap,
      },
    },
    "/players/{account_id}/wordcloud": {
      get: {
        operationId: generateOperationId(
          "get",
          "/players/{account_id}/wordcloud"
        ),
        summary: "GET /players/{account_id}/wordcloud",
        description: "Words said/read in matches played",
        tags: ["players"],
        parameters: playerParams,
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/PlayerWordCloudResponse`,
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/wordcloud",
        func: playersHandler.getPlayersByAccountIdWordCloud,
      },
    },
    "/players/{account_id}/ratings": {
      get: {
        operationId: generateOperationId(
          "get",
          "/players/{account_id}/ratings"
        ),
        summary: "GET /players/{account_id}/ratings",
        description: "Player rating history",
        tags: ["players"],
        parameters: [{ $ref: "#/components/parameters/accountIdParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/PlayerRatingsResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/ratings",
        func: playersHandler.getPlayersByAccountIdRatings,
      },
    },
    "/players/{account_id}/rankings": {
      get: {
        operationId: generateOperationId(
          "get",
          "/players/{account_id}/rankings"
        ),
        summary: "GET /players/{account_id}/rankings",
        description: "Player hero rankings",
        tags: ["players"],
        parameters: [{ $ref: "#/components/parameters/accountIdParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/PlayerRankingsResponse",
                  },
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/rankings",
        func: playersHandler.getPlayersByAccountIdRankings,
      },
    },
    "/players/{account_id}/refresh": {
      post: {
        summary: "POST /players/{account_id}/refresh",
        description: "Refresh player match history",
        tags: ["players"],
        parameters: [{ $ref: "#/components/parameters/accountIdParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  title: "PlayerRefreshResponse",
                  type: "object",
                },
              },
            },
          },
        },
        route: () => "/players/:account_id/refresh",
        func: playersHandler.getPlayersByAccountIdRefresh,
      },
    },
    "/proPlayers": {
      get: {
        operationId: generateOperationId("get", "/proPlayers"),
        summary: "GET /proPlayers",
        description: "Get list of pro players",
        tags: ["pro players"],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/PlayerObjectResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/proPlayers",
        func: playersHandler.getProPlayers,
      },
    },
    "/proMatches": {
      get: {
        operationId: generateOperationId("get", "/proMatches"),
        summary: "GET /proMatches",
        description: "Get list of pro matches",
        tags: ["pro matches"],
        parameters: [{ $ref: "#/components/parameters/lessThanMatchIdParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/MatchObjectResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/proMatches",
        func: matchesHandler.getProMatches,
      },
    },
    "/publicMatches": {
      get: {
        operationId: generateOperationId("get", "/publicMatches"),
        summary: "GET /publicMatches",
        description: "Get list of randomly sampled public matches",
        tags: ["public matches"],
        parameters: [
          { $ref: "#/components/parameters/lessThanMatchIdParam" },
          { $ref: "#/components/parameters/minRankParam" },
          { $ref: "#/components/parameters/maxRankParam" },
          { $ref: "#/components/parameters/mmrAscendingParam" },
          { $ref: "#/components/parameters/mmrDescendingParam" },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/PublicMatchesResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/publicMatches",
        func: matchesHandler.getPublicMatches,
      },
    },
    "/parsedMatches": {
      get: {
        operationId: generateOperationId("get", "/parsedMatches"),
        summary: "GET /parsedMatches",
        description: "Get list of parsed match IDs",
        tags: ["parsed matches"],
        parameters: [{ $ref: "#/components/parameters/lessThanMatchIdParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/ParsedMatchesResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/parsedMatches",
        func: matchesHandler.getParsedMatches,
      },
    },
    "/explorer": {
      get: {
        operationId: generateOperationId("get", "/explorer"),
        summary: "GET /explorer",
        description: "Submit arbitrary SQL queries to the database",
        tags: ["explorer"],
        parameters: [
          {
            name: "sql",
            in: "query",
            description: "The PostgreSQL query as percent-encoded string.",
            required: false,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  title: "ExplorerResponse",
                  type: "object",
                },
              },
            },
          },
        },
        route: () => "/explorer",
        func: databaseHandler.explorer,
      },
    },
    "/metadata": {
      get: {
        operationId: generateOperationId("get", "/metadata"),
        summary: "GET /metadata",
        description: "Site metadata",
        tags: ["metadata"],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/MetadataResponse`,
                },
              },
            },
          },
        },
        route: () => "/metadata",
        func: databaseHandler.getMetadata,
      },
    },
    "/distributions": {
      get: {
        operationId: generateOperationId("get", "/distributions"),
        summary: "GET /distributions",
        description: "Distributions of MMR data by bracket and country",
        tags: ["distributions"],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/DistributionsResponse`,
                },
              },
            },
          },
        },
        route: () => "/distributions",
        func: databaseHandler.getMmrDistributions,
      },
    },
    "/search": {
      get: {
        operationId: generateOperationId("get", "/search"),
        summary: "GET /search",
        description: "Search players by personaname.",
        tags: ["search"],
        parameters: [
          {
            name: "q",
            in: "query",
            description: "Search string",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/SearchResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/search",
        func: playersHandler.searchPlayers,
      },
    },
    "/rankings": {
      get: {
        operationId: generateOperationId("get", "/rankings"),
        summary: "GET /rankings",
        description: "Top players by hero",
        tags: ["rankings"],
        parameters: [
          {
            name: "hero_id",
            in: "query",
            description: "Hero ID",
            required: true,
            schema: {
              type: "string", //todo: String for hero id?
            },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/RankingsResponse`,
                },
              },
            },
          },
        },
        route: () => "/rankings",
        func: heroesHandler.getHeroRankings,
      },
    },
    "/benchmarks": {
      get: {
        operationId: generateOperationId("get", "/benchmarks"),
        summary: "GET /benchmarks",
        description: "Benchmarks of average stat values for a hero",
        tags: ["benchmarks"],
        parameters: [
          {
            name: "hero_id",
            in: "query",
            description: "Hero ID",
            required: true,
            schema: {
              type: "string", // todo: String for hero id?
            },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/BenchmarksResponse`,
                },
              },
            },
          },
        },
        route: () => "/benchmarks",
        func: heroesHandler.getHeroBenchmarks,
      },
    },
    "/status": {
      get: {
        operationId: generateOperationId("get", "/status"),
        summary: "GET /status",
        description: "Get current service statistics",
        tags: ["status"],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  title: "StatusResponse",
                  type: "object",
                },
              },
            },
          },
        },
        route: () => "/status",
        func: databaseHandler.getBuildStatus,
      },
    },
    "/health": {
      get: {
        operationId: generateOperationId("get", "/health"),
        summary: "GET /health",
        description: "Get service health data",
        tags: ["health"],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  title: "HealthResponse",
                  type: "object",
                },
              },
            },
          },
        },
        route: () => "/health/:metric?",
        func: databaseHandler.getHealth,
      },
    },
    "/request/{jobId}": {
      get: {
        operationId: generateOperationId("get", "/request/{jobId}"),
        summary: "GET /request/{jobId}",
        description: "Get parse request state",
        tags: ["request"],
        parameters: [
          {
            name: "jobId",
            in: "path",
            description: "The job ID to query.",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  title: "RequestJobResponse",
                  type: "object",
                },
              },
            },
          },
        },
        route: () => "/request/:jobId",
        func: databaseHandler.getRequestState,
      },
    },
    "/request/{match_id}": {
      post: {
        summary: "POST /request/{match_id}",
        description: "Submit a new parse request",
        tags: ["request"],
        parameters: [{ $ref: "#/components/parameters/matchIdParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  title: "RequestMatchResponse",
                  type: "object",
                },
              },
            },
          },
        },
        route: () => "/request/:match_id",
        func: databaseHandler.requestParse,
      },
    },
    "/findMatches": {
      get: {
        operationId: generateOperationId("get", "/findMatches"),
        summary: "GET /",
        description: "Finds recent matches by heroes played",
        tags: ["findMatches"],
        parameters: [
          {
            name: "teamA",
            in: "query",
            description: "Hero IDs on first team (array)",
            required: false,
            style: "form",
            explode: false,
            schema: {
              type: "array",
              items: {
                type: "integer",
              },
            },
          },
          {
            name: "teamB",
            in: "query",
            description: "Hero IDs on second team (array)",
            required: false,
            style: "form",
            explode: false,
            schema: {
              type: "array",
              items: {
                type: "integer",
              },
            },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  title: "FindMatchesResponse",
                  type: "array",
                  items: {
                    type: "object",
                  },
                },
              },
            },
          },
        },
        route: () => "/findMatches",
        func: matchesHandler.findMatches,
      },
    },
    "/heroes": {
      get: {
        operationId: generateOperationId("get", "/heroes"),
        summary: "GET /heroes",
        description: "Get hero data",
        tags: ["heroes"],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/HeroObjectResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/heroes",
        func: heroesHandler.getHeroData,
      },
    },
    "/heroStats": {
      get: {
        operationId: generateOperationId("get", "/heroStats"),
        summary: "GET /heroStats",
        description: "Get stats about hero performance in recent matches",
        tags: ["hero stats"],
        parameters: [],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/HeroStatsResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/heroStats",
        func: heroesHandler.getHeroStats,
      },
    },
    "/heroes/{hero_id}/matches": {
      get: {
        operationId: generateOperationId("get", "/heroes/{hero_id}/matches"),
        summary: "GET /heroes/{hero_id}/matches",
        description: "Get recent matches with a hero",
        tags: ["heroes"],
        parameters: [{ $ref: "#/components/parameters/heroIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/MatchObjectResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/heroes/:hero_id/matches",
        func: heroesHandler.getRecentMatchesByHeroId
      },
    },
    "/heroes/{hero_id}/matchups": {
      get: {
        operationId: generateOperationId("get", "/heroes/{hero_id}/matchups"),
        summary: "GET /heroes/{hero_id}/matchups",
        description: "Get results against other heroes for a hero",
        tags: ["heroes"],
        parameters: [{ $ref: "#/components/parameters/heroIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/HeroMatchupsResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/heroes/:hero_id/matchups",
        func: heroesHandler.getMatchupsByHeroId,
      },
    },
    "/heroes/{hero_id}/durations": {
      get: {
        operationId: generateOperationId("get", "/heroes/{hero_id}/durations"),
        summary: "GET /heroes/{hero_id}/durations",
        description: "Get hero performance over a range of match durations",
        tags: ["heroes"],
        parameters: [{ $ref: "#/components/parameters/heroIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/HeroDurationsResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/heroes/:hero_id/durations",
        func: heroesHandler.getMatchDurationsByHeroId,
      },
    },
    "/heroes/{hero_id}/players": {
      get: {
        operationId: generateOperationId("get", "/heroes/{hero_id}/players"),
        summary: "GET /heroes/{hero_id}/players",
        description: "Get players who have played this hero",
        tags: ["heroes"],
        parameters: [{ $ref: "#/components/parameters/heroIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    type: "array", //todo: Why double array?
                    items: {
                      $ref: `#/components/schemas/PlayerObjectResponse`,
                    },
                  },
                },
              },
            },
          },
        },
        route: () => "/heroes/:hero_id/players",
        func: heroesHandler.getPlayersByHeroId,
      },
    },
    "/heroes/{hero_id}/itemPopularity": {
      get: {
        operationId: generateOperationId(
          "get",
          "/heroes/{hero_id}/itemPopularity"
        ),
        summary: "GET /heroes/{hero_id}/itemPopularity",
        description:
          "Get item popularity of hero categoried by start, early, mid and late game, analyzed from professional games",
        tags: ["heroes"],
        parameters: [{ $ref: "#/components/parameters/heroIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/HeroItemPopularityResponse`,
                },
              },
            },
          },
        },
        route: () => "/heroes/:hero_id/itemPopularity",
        func: heroesHandler.getItemPopularityByHeroId,
      },
    },
    "/leagues": {
      get: {
        operationId: generateOperationId("get", "/leagues"),
        summary: "GET /leagues",
        description: "Get league data",
        tags: ["leagues"],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/LeagueObjectResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/leagues",
        func: leaguesHandler.getLeagues,
      },
    },
    "/leagues/{league_id}": {
      get: {
        operationId: generateOperationId("get", "/leagues/{league_id}"),
        summary: "GET /leagues/{league_id}",
        description: "Get data for a league",
        tags: ["leagues"],
        parameters: [{ $ref: "#/components/parameters/leagueIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/LeagueObjectResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/leagues/:league_id",
        func: leaguesHandler.getLeaguesById,
      },
    },
    "/leagues/{league_id}/matches": {
      get: {
        operationId: generateOperationId("get", "/leagues/{league_id}/matches"),
        summary: "GET /leagues/{league_id}/matches",
        description: "Get matches for a team",
        tags: ["leagues"],
        parameters: [{ $ref: "#/components/parameters/leagueIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/MatchObjectResponse`,
                },
              },
            },
          },
        },
        route: () => "/leagues/:league_id/matches",
        func: leaguesHandler.getMatchesByLeagueId,
      },
    },
    "/leagues/{league_id}/teams": {
      get: {
        operationId: generateOperationId("get", "/leagues/{league_id}/teams"),
        summary: "GET /leagues/{league_id}/teams",
        description: "Get teams for a league",
        tags: ["leagues"],
        parameters: [{ $ref: "#/components/parameters/leagueIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: "#/components/schemas/TeamObjectResponse",
                },
              },
            },
          },
        },
        route: () => "/leagues/:league_id/teams",
        func: leaguesHandler.getTeamsByLeagueId,
      },
    },
    "/teams": {
      get: {
        operationId: generateOperationId("get", "/teams"),
        summary: "GET /teams",
        description: "Get team data",
        tags: ["teams"],
        parameters: [
          {
            name: "page",
            in: "query",
            description:
              "Page number, zero indexed. Each page returns up to 1000 entries.",
            required: false,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/TeamObjectResponse",
                  },
                },
              },
            },
          },
        },
        route: () => "/teams",
        func: teamsHandler.getTeamsData,
      },
    },
    "/teams/{team_id}": {
      get: {
        operationId: generateOperationId("get", "/teams/{team_id}"),
        summary: "GET /teams/{team_id}",
        description: "Get data for a team",
        tags: ["teams"],
        parameters: [{ $ref: "#/components/parameters/teamIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: "#/components/schemas/TeamObjectResponse",
                },
              },
            },
          },
        },
        route: () => "/teams/:team_id",
        func: teamsHandler.getTeamById,
      },
    },
    "/teams/{team_id}/matches": {
      get: {
        operationId: generateOperationId("get", "/teams/{team_id}/matches"),
        summary: "GET /teams/{team_id}/matches",
        description: "Get matches for a team",
        tags: ["teams"],
        parameters: [{ $ref: "#/components/parameters/teamIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/TeamMatchObjectResponse`,
                },
              },
            },
          },
        },
        route: () => "/teams/:team_id/matches",
        func: teamsHandler.getMatchesByTeamId,
      },
    },
    "/teams/{team_id}/players": {
      get: {
        operationId: generateOperationId("get", "/teams/{team_id}/players"),
        summary: "GET /teams/{team_id}/players",
        description: "Get players who have played for a team",
        tags: ["teams"],
        parameters: [{ $ref: "#/components/parameters/teamIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/TeamPlayersResponse`,
                },
              },
            },
          },
        },
        route: () => "/teams/:team_id/players",
        func: teamsHandler.getPlayersByTeamId,
      },
    },
    "/teams/{team_id}/heroes": {
      get: {
        operationId: generateOperationId("get", "/teams/{team_id}/heroes"),
        summary: "GET /teams/{team_id}/heroes",
        description: "Get heroes for a team",
        tags: ["teams"],
        parameters: [{ $ref: "#/components/parameters/teamIdPathParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  $ref: `#/components/schemas/TeamHeroesResponse`,
                },
              },
            },
          },
        },
        route: () => "/teams/:team_id/heroes",
        func: teamsHandler.getHeroesByTeamId,
      },
    },
    "/replays": {
      get: {
        operationId: generateOperationId("get", "/replays"),
        summary: "GET /replays",
        description: "Get data to construct a replay URL with",
        tags: ["replays"],
        parameters: [{ $ref: "#/components/parameters/matchIdParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/ReplaysResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/replays",
        func: databaseHandler.getReplayData,
      },
    },
    "/records/{field}": {
      get: {
        operationId: generateOperationId("get", "/records/{field}"),
        summary: "GET /records/{field}",
        description: "Get top performances in a stat",
        tags: ["records"],
        parameters: [
          {
            name: "field",
            in: "path",
            description: "Field name to query",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/RecordsResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/records/:field",
        func: databaseHandler.getRecordsByField,
      },
    },
    "/live": {
      get: {
        operationId: generateOperationId("get", "/live"),
        summary: "GET /live",
        description: "Get top currently ongoing live games",
        tags: ["live"],
        parameters: [],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    title: "LiveResponse",
                    type: "object",
                    properties: {},
                  },
                },
              },
            },
          },
        },
        route: () => "/live",
        func: matchesHandler.getLiveMatches,
      },
    },
    "/scenarios/itemTimings": {
      get: {
        operationId: generateOperationId("get", "/scenarios/itemTimings"),
        summary: "GET /scenarios/itemTimings",
        description:
          "Win rates for certain item timings on a hero for items that cost at least 1400 gold",
        tags: ["scenarios"],
        parameters: [
          {
            name: "item",
            in: "query",
            description: 'Filter by item name e.g. "spirit_vessel"',
            required: false,
            schema: {
              type: "string",
            },
          },
          { $ref: "#/components/parameters/heroIdParam" },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/ScenarioItemTimingsResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/scenarios/itemTimings",
        func: databaseHandler.getItemTimings,
      },
    },
    "/scenarios/laneRoles": {
      get: {
        operationId: generateOperationId("get", "/scenarios/laneRoles"),
        summary: "GET /scenarios/laneRoles",
        description: "Win rates for heroes in certain lane roles",
        tags: ["scenarios"],
        parameters: [
          {
            name: "lane_role",
            in: "query",
            description: "Filter by lane role 1-4 (Safe, Mid, Off, Jungle)",
            required: false,
            schema: {
              type: "string",
            },
          },
          { $ref: "#/components/parameters/heroIdParam" },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/ScenarioLaneRolesResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/scenarios/laneRoles",
        func: databaseHandler.getLaneRoles,
      },
    },
    "/scenarios/misc": {
      get: {
        operationId: generateOperationId("get", "/scenarios/misc"),
        summary: "GET /scenarios/misc",
        description: "Miscellaneous team scenarios",
        tags: ["scenarios"],
        parameters: [{ $ref: "#/components/parameters/scenarioParam" }],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/ScenarioMiscResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/scenarios/misc",
        func: databaseHandler.getTeamScenarios,
      },
    },
    "/schema": {
      get: {
        operationId: generateOperationId("get", "/schema"),
        summary: "GET /schema",
        description: "Get database schema",
        tags: ["schema"],
        parameters: [],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    $ref: `#/components/schemas/SchemaResponse`,
                  },
                },
              },
            },
          },
        },
        route: () => "/schema",
        func: databaseHandler.getSchema,
      },
    },
    "/constants/{resource}": {
      get: {
        operationId: generateOperationId("get", "/constants/{resource}"),
        summary: "GET /constants",
        description:
          "Get static game data mirrored from the dotaconstants repository.",
        tags: ["constants"],
        parameters: [
          {
            name: "resource",
            in: "path",
            description:
              "Resource name e.g. `heroes`. [List of resources](https://github.com/odota/dotaconstants/tree/master/build)",
            required: true,
            schema: {
              type: "string",
            },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  nullable: true,
                  oneOf: [
                    {
                      type: "object",
                      additionalProperties: {
                        title: "ConstantResourceResponse",
                      },
                    },
                    {
                      type: "array",
                      items: {
                        oneOf: [
                          {
                            type: "object",
                            additionalProperties: {
                              title: "ConstantResourceResponse",
                            },
                          },
                          {
                            type: "integer",
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        route: () => "/constants/:resource?",
        func: databaseHandler.getConstantsByResource,
      },
    },
    "/constants": {
      get: {
        operationId: generateOperationId("get", "/constants"),
        summary: "GET /constants",
        description: "Gets an array of available resources.",
        tags: ["constants"],
        parameters: [],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json; charset=utf-8": {
                schema: {
                  type: "array",
                  items: {
                    title: "ConstantsResponse",
                    type: "string",
                  },
                },
              },
            },
          },
        },
        route: () => "/constants",
        func: databaseHandler.getConstants,
      },
    },
  },
};
module.exports = spec;
