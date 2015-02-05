var dotenv = require('dotenv');
dotenv.load();
var BigNumber = require('big-number').n,
    request = require('request'),
    winston = require('winston'),
    redis = require('redis'),
    moment = require('moment'),
    parseRedisUrl = require('parse-redis-url')(redis);
var spawn = require("child_process").spawn;
var api_url = "http://api.steampowered.com";
var api_keys = process.env.STEAM_API_KEY.split(",");
var retrievers = (process.env.RETRIEVER_HOST || "http://localhost:5100").split(",");
var urllib = require('url');

var options = parseRedisUrl.parse(process.env.REDIS_URL || "redis://127.0.0.1:6379/0");
//set keys for kue
options.auth = options.password;
options.db = options.database;
var kue = require('kue');
var db = require('monk')(process.env.MONGO_URL || "mongodb://localhost/dota");
db.get('matches').index({
    'match_id': -1
}, {
    unique: true
});
db.get('matches').index({
    'match_seq_num': -1
}, {
    unique: true
});
db.get('matches').index('players.account_id');
db.get('players').index('account_id', {
    unique: true
});
db.matches = db.get('matches');
db.players = db.get('players');
var redisclient = redis.createClient(options.port, options.host, {
    auth_pass: options.password
});
var jobs = kue.createQueue({
    redis: options
});
var transports = [];
if (process.env.NODE_ENV !== "test") {
    transports.push(new(winston.transports.Console)({
        'timestamp': true
    }));
}
var logger = new(winston.Logger)({
    transports: transports
});

/*
 * Converts a steamid 64 to a steamid 32
 *
 * Returns a BigNumber
 */
function convert64to32(id) {
    return new BigNumber(id).minus('76561197960265728');
}

/*
 * Converts a steamid 64 to a steamid 32
 *
 * Returns a BigNumber
 */
function convert32to64(id) {
    return new BigNumber('76561197960265728').plus(id);
}

/*
 * Makes sort from a datatables call
 */
function makeSort(order, columns) {
    var sort = {};
    order.forEach(function(s) {
        var c = columns[Number(s.column)];
        if (c) {
            sort[c.data] = s.dir === 'desc' ? -1 : 1;
        }
    });
    return sort;
}

function isRadiant(player) {
    return player.player_slot < 64;
}

function queueReq(type, payload, cb) {
    checkDuplicate(type, payload, function(err, doc) {
        if (err) {
            return cb(err);
        }
        if (doc) {
            console.log("match already in db");
            return cb(null);
        }
        var job = generateJob(type, payload);
        var kuejob = jobs.create(job.type, job).attempts(10).backoff({
            delay: 60 * 1000,
            type: 'exponential'
        }).removeOnComplete(true).priority(payload.priority || 'normal').save(function(err) {
            logger.info("[KUE] created jobid: %s", kuejob.id);
            cb(err, kuejob);
        });
    });
}

function checkDuplicate(type, payload, cb) {
    if (type === "api_details" && payload.match_id) {
        //make sure match doesn't exist already in db before queueing for api
        db.matches.findOne({
            match_id: payload.match_id
        }, function(err, doc) {
            cb(err, doc);
        });
    }
    else {
        //no duplicate check for anything else
        cb(null);
    }
}

function generateJob(type, payload) {
    var api_key = api_keys[Math.floor(Math.random() * api_keys.length)];
    if (type === "api_details") {
        return {
            url: api_url + "/IDOTA2Match_570/GetMatchDetails/V001/?key=" + api_key + "&match_id=" + payload.match_id,
            title: [type, payload.match_id].join(),
            type: "api",
            payload: payload
        };
    }
    if (type === "api_history") {
        var url = api_url + "/IDOTA2Match_570/GetMatchHistory/V001/?key=" + api_key;
        url += payload.account_id ? "&account_id=" + payload.account_id : "";
        url += payload.matches_requested ? "&matches_requested=" + payload.matches_requested : "";
        url += payload.hero_id ? "&hero_id=" + payload.hero_id : "";
        return {
            url: url,
            title: [type, payload.account_id].join(),
            type: "api",
            payload: payload
        };
    }
    if (type === "api_summaries") {
        var steamids = [];
        payload.players.forEach(function(player) {
            steamids.push(convert32to64(player.account_id).toString());
        });
        payload.query = steamids.join();
        return {
            url: api_url + "/ISteamUser/GetPlayerSummaries/v0002/?key=" + api_key + "&steamids=" + payload.query,
            title: [type, payload.summaries_id].join(),
            type: "api",
            payload: payload
        };
    }
    if (type === "api_sequence") {
        return {
            url: api_url + "/IDOTA2Match_570/GetMatchHistoryBySequenceNum/V001/?key=" + api_key + "&start_at_match_seq_num=" + payload.seq_num,
            title: [type, payload.seq_num].join(),
            type: "api",
            payload: payload
        };
    }
    if (type === "api_heroes") {
        return {
            url: api_url + "/IEconDOTA2_570/GetHeroes/v0001/?key=" + api_key + "&language=" + payload.language,
            title: [type, payload.language].join(),
            type: "api",
            payload: payload
        };
    }
    if (type === "parse") {
        return {
            title: [type, payload.match_id].join(),
            type: type,
            fileName: payload.fileName,
            uploader: payload.uploader,
            payload: payload
        };
    }
}

function getData(url, cb) {
        var delay = 1000;
        var parse = urllib.parse(url, true);
        //inject a random retriever
        if (parse.host === "retriever") {
            //todo inject a retriever key
            parse.host = retrievers[Math.floor(Math.random() * retrievers.length)];
        }
        //inject a random key if steam api request
        if (parse.host === "api.steampowered.com") {
            parse.query.key = api_keys[Math.floor(Math.random() * api_keys.length)];
            parse.search = null;
            delay = 1000 / api_keys.length;
        }
        var target = urllib.format(parse);
        logger.info("getData: %s", target);
        request({
            url: target,
            json: true,
            timeout: 15000
        }, function(err, res, body) {
            if (err || res.statusCode !== 200 || !body) {
                logger.info("retrying: %s", target);
                return setTimeout(function() {
                    getData(url, cb);
                }, delay);
            }
            if (body.result) {
                //steam api response
                if (body.result.status === 15 || body.result.error === "Practice matches are not available via GetMatchDetails" || body.result.error === "No Match ID specified") {
                    //user does not have stats enabled or attempting to get private match/invalid id, don't retry
                    return setTimeout(function() {
                        cb(body);
                    }, delay);
                }
                else if (body.result.error || body.result.status === 2) {
                    //valid response, but invalid data, retry
                    logger.info("invalid data: %s, %s", target, JSON.stringify(body));
                    return setTimeout(function() {
                        getData(url, cb);
                    }, delay);
                }
            }
            return setTimeout(function() {
                cb(null, body);
            }, delay);
        });
    }
    /*
        function getS3Url(match_id, cb) {
            var archiveName = match_id + ".dem.bz2";
            var s3 = new AWS.S3();
            var params = {
                Bucket: process.env.AWS_S3_BUCKET,
                Key: archiveName
            };
            var url;
            try {
                url = s3.getSignedUrl('getObject', params);
                cb(null, url);
            }
            catch (e) {
                logger.info("[S3] %s not in S3", match_id);
                cb(new Error("S3 UNAVAILABLE"));
            }
        }
        function uploadToS3(data, archiveName, cb) {
            var s3 = new AWS.S3();
            var params = {
                Bucket: process.env.AWS_S3_BUCKET,
                Key: archiveName
            };
            params.Body = data;
            s3.putObject(params, function(err, data) {
                cb(err);
            });
        }
    */
function insertMatch(match, cb) {
    match.parse_status = match.parsed_data ? 2 : 0;
    db.matches.update({
            match_id: match.match_id
        }, {
            $set: match
        }, {
            upsert: true
        },
        function(err) {
            if (!match.parse_status) {
                queueReq("parse", match, function(err) {
                    cb(err);
                });
            }
            else {
                cb(err);
            }
        });
}

function insertPlayer(player, cb) {
    var account_id = Number(convert64to32(player.steamid));
    player.last_summaries_update = new Date();
    db.players.update({
        account_id: account_id
    }, {
        $set: player
    }, {
        upsert: true
    }, function(err) {
        cb(err);
    });
}

function selector(type) {
    var types = {
        "untrack": {
            track: 1,
            join_date: {
                $lt: moment().subtract(10, 'day').toDate()
            }
        },
        "fullhistory": {
            track: 1,
            last_visited: {
                $lt: moment().subtract(5, 'days').toDate()
            }
        }
    };
    return types[type];
}

function runParse(cb) {
    var parser_file = "parser/target/stats-0.1.0.jar";
    var output = "";
    var parser = spawn("java", ["-jar",
        parser_file
    ]);
    parser.stdout.on('data', function(data) {
        output += data;
    });
    parser.on('exit', function(code) {
        logger.info("[PARSER] exit code: %s", code);
        if (code) {
            return cb(code);
        }
        try {
            output = JSON.parse(output);
            cb(null, output);
        }
        catch (err) {
            cb(err);
        }
    });
    return parser;
}

function initializeUser(identifier, profile, done) {
    var steam32 = Number(convert64to32(identifier.substr(identifier.lastIndexOf("/") + 1)));
    var insert = profile._json;
    insert.account_id = steam32;
    insert.join_date = new Date();
    insert.track = 1;
    db.players.insert(insert, function(err, doc) {
        //if already exists, just find and return the user
        if (err) {
            db.players.findOne({
                account_id: steam32
            }, function(err, doc) {
                return done(err, doc);
            });
        }
        else {
            return done(err, doc);
        }
    });
}

module.exports = {
    //utilities
    db: db,
    redis: redisclient,
    logger: logger,
    kue: kue,
    jobs: jobs,
    convert32to64: convert32to64,
    convert64to32: convert64to32,
    isRadiant: isRadiant,
    generateJob: generateJob,
    getData: getData,
    queueReq: queueReq,
    makeSort: makeSort,
    selector: selector,
    insertPlayer: insertPlayer,
    insertMatch: insertMatch,
    runParse: runParse,
    initializeUser: initializeUser
};
