import { archivedFetcher } from '../fetcher/getArchivedData.js';

const { matchArchive } = await import('../store/archive.js');

// Read some match data
// const match = await getMatchDataFromBlob(7465883253);
// const blob = Buffer.from(JSON.stringify(match));

// Archive it
// const putRes = await archive.archivePut(match.match_id?.toString() ?? '', blob);
// console.log(putRes);

// Read it back
// const readBack = await readArchivedMatch(match.match_id!);

// console.log(JSON.stringify(match).length, JSON.stringify(readBack).length);

// Verify we get back null for invalid match id
const nullMatch = await archivedFetcher.readData(123);
console.log(nullMatch);

// Confirm API returns the same data whether we used the archive or not
