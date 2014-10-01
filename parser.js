var async = require("async"),
    request = require("request"),
    fs = require("fs"),
    spawn = require('child_process').spawn,
    moment = require('moment'),
    Bunzip = require('seek-bzip'),
    utility = require('./utility'),
    matches = utility.matches,
    steam = require("steam"),
    dota2 = require("dota2"),
    Steam = new steam.SteamClient(),
    Dota2 = new dota2.Dota2Client(Steam, false),
    AWS = require('aws-sdk');
//todo provide method to request parser node to update its constants
var express = require('express'); // call express
var app = express(); // define our app using express
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
    extended: true
}));
var port = 9001;
var router = express.Router();
router.route('/').post(function(req, res) {
    matches.findOne({
        match_id: parseInt(req.body.match_id)
    }, function(err, doc) {
        pq.push(doc, function(err) {})
        console.log("[PARSER] parse request: match %s, position %s", req.body.match_id, pq.length())
        res.json({
            position: pq.length()
        })
    })
})
app.use('/', router);
app.listen(port);
console.log('[PARSER] listening on port ' + port);
var loginNum = 0
var users = process.env.STEAM_USER.split()
var passes = process.env.STEAM_PASS.split()
var codes = process.env.STEAM_GUARD_CODE.split()
var pq = async.queue(parseReplay, 1)
var replay_dir = "replays/"
var parser_file = "./parser/target/stats-0.1.0.jar"
if(!fs.existsSync(replay_dir)) {
    fs.mkdir(replay_dir)
}
/*
 * Downloads a match replay
 */

function download(match, cb) {
    var match_id = match.match_id
    var fileName = replay_dir + match_id + ".dem"
    if(fs.existsSync(fileName)) {
        console.log("[PARSER] found local replay for match %s", match_id)
        cb(null, fileName);
    } else {
        getReplayUrl(match, function(err, url) {
            if(err) {
                return cb(err)
            }
            downloadWithRetry(url, fileName, 1000, function() {
                console.log("[PARSER] downloaded replay for match %s", match_id)
                cb(null, fileName)
            })
        })
    }
}
/*
 * Logs onto steam and launches Dota 2
 */

function logOnSteam(user, pass, authcode, cb) {
    var onSteamLogOn = function onSteamLogOn() {
        console.log("[STEAM] Logged on.");
        Dota2.launch();
        Dota2.on("ready", function() {
            cb(null)
        })
    },
        onSteamSentry = function onSteamSentry(newSentry) {
            console.log("[STEAM] Received sentry.");
            fs.writeFileSync("sentry", newSentry);
        },
        onSteamServers = function onSteamServers(servers) {
            console.log("[STEAM] Received servers.");
            fs.writeFile("servers", JSON.stringify(servers));
        },
        onSteamError = function onSteamError(e) {
            console.log(e)
            cb(e)
        };
    if(!fs.existsSync("sentry")) {
        fs.openSync("sentry", 'w')
    }
    var logOnDetails = {
        "accountName": user,
        "password": pass
    },
        sentry = fs.readFileSync("sentry");
    if(authcode) logOnDetails.authCode = authcode;
    if(sentry.length) logOnDetails.shaSentryfile = sentry;
    Steam.logOn(logOnDetails);
    Steam.on("loggedOn", onSteamLogOn).on('sentry', onSteamSentry).on('servers', onSteamServers).on('error', onSteamError);
}
/*
 * Gets the replay url from dota
 */

function getReplayUrl(match, cb) {
    if(match.start_time > moment().subtract(7, 'days').format('X')) {
        if(!Steam.loggedOn) {
            loginNum += 1
            loginNum = loginNum % users.length
            logOnSteam(users[loginNum], passes[loginNum], codes[loginNum], function(err) {
                getReplayUrl(match, cb)
            })
        } else {
            console.log("[DOTA] requesting replay %s", match.match_id)
            var timeoutProtect = setTimeout(function() {
                // Clear the local timer variable, indicating the timeout has been triggered.
                timeoutProtect = null;
                Dota2.exit()
                Steam.logOff()
                console.log("[DOTA] request for replay timed out, relogging")
                getReplayUrl(match, cb)
            }, 15000)
            Dota2.matchDetailsRequest(match.match_id, function(err, data) {
                if(timeoutProtect) {
                    clearTimeout(timeoutProtect);
                    if(err) {
                        return cb(err)
                    }
                    var url = "http://replay" + data.match.cluster + ".valve.net/570/" + match.match_id + "_" + data.match.replaySalt + ".dem.bz2";
                    return cb(null, url)
                }
            })
        }
    } else {
        var match_id = match.match_id
        var fileName = replay_dir + match_id + ".dem"
        var archiveName = fileName + ".bz2"
        var s3 = new AWS.S3()
        var params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: archiveName
        }
        s3.headObject(params, function(err, data) {
            if (!err){
                var url = s3.getSignedUrl('getObject', params);
                cb(null, url)
            }
            else {
                cb("Replay expired")
            }
        })
    }
}

function uploadToS3(archiveName, body, cb) {
    if(process.env.AWS_S3_BUCKET) {
        var s3 = new AWS.S3()
        var params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: archiveName
        }
        s3.headObject(params, function(err, data) {
            if(err) {
                params.Body = body
                s3.putObject(params, function(err, data) {
                    if(err) {
                        console.log('[S3] could not upload to S3')
                    } else {
                        console.log('[S3] Successfully uploaded replay to S3: %s ', archiveName)
                    }
                    cb(err)
                })
            } else {
                console.log('[S3] replay already exists in S3')
                cb(err)
            }
        })
    } else {
        cb(null)
    }
}
/*
 * Tries to download a file from the url repeatedly
 */

function downloadWithRetry(url, fileName, timeout, cb) {
    request({
        url: url,
        encoding: null
    }, function(err, response, body) {
        if(err || response.statusCode !== 200) {
            console.log("[PARSER] failed to download from %s, retrying in %ds", url, timeout / 1000)
            setTimeout(downloadWithRetry, timeout, url, fileName, timeout * 2, cb);
        } else {
            var archiveName = fileName + ".bz2"
            uploadToS3(archiveName, body, function(err) {
                //decompress and write locally
                var decomp = Bunzip.decode(body);
                fs.writeFile(fileName, decomp, function(err) {
                    cb(null)
                })
            })
        }
    })
}
/*
 * Parses a replay for a match
 */

function parseReplay(match, cb) {
    var match_id = match.match_id
    console.log("[PARSER] requesting parse for match %s", match_id)
    download(match, function(err, fileName) {
        if(err) {
            console.log("[PARSER] Error for match %s: %s", match_id, err)
            matches.update({
                match_id: match_id
            }, {
                $set: {
                    parse_status: 1
                }
            })
            return cb(err)
        }
        console.log("[PARSER] running parse on %s", fileName)
        var output = ""
        var cp = spawn("java", ["-jar",
                                parser_file,
                                fileName, "constants.json"
                               ])
        cp.stdout.on('data', function(data) {
            output += data
        })
        cp.stderr.on('data', function(data) {
            console.log('[PARSER] match: %s, stderr: %s', match_id, data);
        })
        cp.on('close', function(code) {
            console.log('[PARSER] match: %s, exit code: %s', match_id, code);
            if(!code) {
                matches.update({
                    match_id: match_id
                }, {
                    $set: {
                        parsed_data: JSON.parse(output),
                        parse_status: 2
                    }
                })
                if(process.env.DELETE_REPLAYS) {
                    fs.unlink(fileName)
                }
            }
            cb(code)
        })
    })
}