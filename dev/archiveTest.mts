import archiveImport from '../store/archive.js';
import {
  getArchivedMatch,
  getMatchDataFromCassandra,
  getPlayerMatchData,
} from '../store/queries.js';
const { Archive } = archiveImport;

// Read some match data
const match = {
  ...(await getMatchDataFromCassandra('7465883253')),
  players: await getPlayerMatchData('7465883253'),
};
const blob = Buffer.from(JSON.stringify(match));

const archive = new Archive('match');
// Archive it
const putRes = await archive.archivePut(match.match_id?.toString() ?? '', blob);
console.log(putRes);

// Read it back
const readBack = await getArchivedMatch(match.match_id?.toString() ?? '');

console.log(JSON.stringify(match).length, JSON.stringify(readBack).length);

// Verify we get back null for invalid match id
const nullMatch = await getArchivedMatch('123');
console.log(nullMatch);

// Confirm API returns the same data whether we used the archive or not
