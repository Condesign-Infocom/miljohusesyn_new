import { withDomainStoreClient } from '../src/lib/server/domain-store/client';

type SnapshotRow = {
	id: string;
};

type FactRow = {
	id: string;
	factId: string;
	nodeId: string | null;
	title: string;
	sourceFile: string;
};

type FactLinkRow = {
	id: string;
	nodeId: string;
	linkSource: string;
	linkStatus: string;
};

function scoreFactRow(row: FactRow) {
	let score = 0;

	if (/factid\d+/i.test(row.sourceFile)) {
		score += 100;
	}

	if (/[\\/][A-Z]\d+-/i.test(row.sourceFile)) {
		score += 25;
	}

	if (/[\\/][A-Z]0\d-/i.test(row.sourceFile)) {
		score -= 25;
	}

	score += row.sourceFile.length / 1000;
	return score;
}

function chooseKeeper(rows: FactRow[]) {
	return [...rows].sort((left, right) => {
		const scoreDelta = scoreFactRow(right) - scoreFactRow(left);
		if (scoreDelta !== 0) {
			return scoreDelta;
		}

		return right.id.localeCompare(left.id, 'sv');
	})[0];
}

function linkSignature(link: FactLinkRow) {
	return `${link.nodeId}::${link.linkSource}::${link.linkStatus}`;
}

async function main() {
	const snapshotId = process.argv[2];

	const summary = await withDomainStoreClient(async (client) => {
		const latestSnapshot =
			snapshotId ?
				{ id: snapshotId }
			:	await client.get<SnapshotRow>(
					`
						select id
						from content_snapshots
						order by imported_at desc, id desc
						limit 1
					`
				);

		if (!latestSnapshot?.id) {
			throw new Error('Ingen snapshot hittades i domain store.');
		}

		const duplicateFactIds = await client.all<{ factId: string; count: string }>(
			`
				select fact_id as "factId", count(*)::text as "count"
				from facts
				where snapshot_id = ? and fact_id is not null and trim(fact_id) <> ''
				group by fact_id
				having count(*) > 1
				order by fact_id asc
			`,
			[latestSnapshot.id]
		);

		await client.run('begin');

		try {
			const processed: Array<{
				factId: string;
				kept: string;
				removed: string[];
			}> = [];

			for (const duplicate of duplicateFactIds) {
				const rows = await client.all<FactRow>(
					`
						select
							id,
							fact_id as "factId",
							node_id as "nodeId",
							title,
							source_file as "sourceFile"
						from facts
						where snapshot_id = ? and fact_id = ?
						order by source_file asc, id asc
					`,
					[latestSnapshot.id, duplicate.factId]
				);

				if (rows.length < 2) {
					continue;
				}

				const keeper = chooseKeeper(rows);
				const duplicatesToRemove = rows.filter((row) => row.id !== keeper.id);
				const keeperLinks = await client.all<FactLinkRow>(
					`
						select
							id,
							node_id as "nodeId",
							link_source as "linkSource",
							link_status as "linkStatus"
						from fact_links
						where snapshot_id = ? and fact_row_id = ?
					`,
					[latestSnapshot.id, keeper.id]
				);
				const keeperSignatures = new Set(keeperLinks.map(linkSignature));

				for (const duplicateRow of duplicatesToRemove) {
					const duplicateLinks = await client.all<FactLinkRow>(
						`
							select
								id,
								node_id as "nodeId",
								link_source as "linkSource",
								link_status as "linkStatus"
							from fact_links
							where snapshot_id = ? and fact_row_id = ?
						`,
						[latestSnapshot.id, duplicateRow.id]
					);

					for (const link of duplicateLinks) {
						const signature = linkSignature(link);

						if (keeperSignatures.has(signature)) {
							await client.run('delete from fact_links where id = ?', [link.id]);
							continue;
						}

						await client.run('update fact_links set fact_row_id = ? where id = ?', [
							keeper.id,
							link.id
						]);
						keeperSignatures.add(signature);
					}

					await client.run('delete from facts where id = ?', [duplicateRow.id]);
				}

				processed.push({
					factId: duplicate.factId,
					kept: keeper.sourceFile,
					removed: duplicatesToRemove.map((row) => row.sourceFile)
				});
			}

			await client.run('commit');

			return {
				snapshotId: latestSnapshot.id,
				processed
			};
		} catch (error) {
			await client.run('rollback');
			throw error;
		}
	});

	console.log(JSON.stringify(summary, null, 2));
}

await main();
