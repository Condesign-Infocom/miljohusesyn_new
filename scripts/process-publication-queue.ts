import { createDb } from '../src/lib/server/db/client';
import { processPublicationQueue } from '../src/lib/server/services/publication-queue';

const db = createDb();
const rawLimit = Number(process.argv[2] ?? '10');
const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;

const results = await processPublicationQueue(db, limit);

console.log(
	JSON.stringify(
		{
			processed: results.length,
			results
		},
		null,
		2
	)
);
