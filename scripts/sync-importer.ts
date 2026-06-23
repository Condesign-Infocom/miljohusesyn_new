import { createDb } from '../src/lib/server/db/client';
import { seedDemoState } from '../src/lib/server/db/seed-demo';
import {
	syncDomainStoreSnapshot,
	syncPostgresDomainStoreSnapshot
} from '../src/lib/server/sync/importer-sync';
import {
	requirePostgresDsn,
	requireSqliteDomainStorePath,
	resolveDomainStoreConfig
} from './domain-store-config';

async function main() {
	const config = resolveDomainStoreConfig();
	const db = createDb();
	const snapshotKeyArg = process.argv[2]?.trim() || undefined;

	if (config.engine === 'postgres') {
		const postgresDsn = requirePostgresDsn();
		const snapshotKey = await syncPostgresDomainStoreSnapshot(db, postgresDsn, snapshotKeyArg);
		await seedDemoState();
		console.log(`Synced importer snapshot ${snapshotKey} from durable domain store ${postgresDsn}`);
		return;
	}

	const domainStorePath = requireSqliteDomainStorePath();
	const snapshotKey = await syncDomainStoreSnapshot(db, domainStorePath, snapshotKeyArg);
	await seedDemoState();
	console.log(`Synced importer snapshot ${snapshotKey} from durable domain store ${domainStorePath}`);
}

await main();
