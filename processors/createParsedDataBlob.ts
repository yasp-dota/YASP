import { Console } from 'console';
import readline from 'readline';
import processAllPlayers from './processAllPlayers.js';
import processTeamfights from './processTeamfights.js';
import processParsedData from './processParsedData.js';
import processMetadata from './processMetadata.js';
import processExpand from './processExpand.js';
import processDraftTimings from './processDraftTimings.js';
import parseSchema from './parseSchema.js';

function createParsedDataBlob(entries: any[], matchId: string) {
  const logConsole = new Console(process.stderr);
  logConsole.time('metadata');
  const meta = processMetadata(entries);
  meta.match_id = matchId;
  logConsole.timeEnd('metadata');
  logConsole.time('expand');
  const expanded = processExpand(entries, meta);
  logConsole.timeEnd('expand');
  logConsole.time('populate');
  const parsedData = processParsedData(expanded, parseSchema, meta);
  logConsole.timeEnd('populate');
  logConsole.time('teamfights');
  parsedData.teamfights = processTeamfights(expanded, meta);
  logConsole.timeEnd('teamfights');
  logConsole.time('draft');
  parsedData.draft_timings = processDraftTimings(entries, meta);
  logConsole.timeEnd('draft');
  logConsole.time('processAllPlayers');
  const ap = processAllPlayers(entries, meta);
  logConsole.timeEnd('processAllPlayers');
  parsedData.radiant_gold_adv = ap.radiant_gold_adv;
  parsedData.radiant_xp_adv = ap.radiant_xp_adv;
  return parsedData;
}
const entries: any[] = [];
let complete = false;
const matchId = process.argv[2];
const parseStream = readline.createInterface({
  input: process.stdin,
});
parseStream.on('line', (e: any) => {
  e = JSON.parse(e);
  entries.push(e);
  if (e.type === 'epilogue') {
    complete = true;
  }
});
parseStream.on('close', () => {
  if (complete) {
    const parsedData = createParsedDataBlob(entries, matchId);
    process.stdout.write(JSON.stringify(parsedData), undefined, (err) => {
      process.exit(Number(err));
    });
  } else {
    process.exit(1);
  }
});
