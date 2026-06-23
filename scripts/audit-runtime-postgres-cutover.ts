import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'src');
const outputPath = path.resolve(process.cwd(), '..', 'status', 'output', 'runtime-postgres-cutover-audit.json');

type MatchGroup = {
	label: string;
	pattern: RegExp;
};

type AuditLayer =
	| 'runtime_boundary'
	| 'unit_test_harness'
	| 'service_surface'
	| 'route_surface'
	| 'runtime_infra'
	| 'ui_support'
	| 'other';

type Finding = {
	file: string;
	layer: AuditLayer;
	boundaryManaged: boolean;
	counts: Record<string, number>;
	total: number;
};

const matchGroups: MatchGroup[] = [
	{ label: 'sqlite_schema_imports', pattern: /sqliteTable|drizzle-orm\/better-sqlite3|better-sqlite3/g },
	{ label: 'sync_run_calls', pattern: /\bdb\.[\s\S]{0,160}?\.run\(/g },
	{ label: 'sync_get_calls', pattern: /\bdb\.[\s\S]{0,160}?\.get\(/g },
	{ label: 'sync_all_calls', pattern: /\bdb\.[\s\S]{0,160}?\.all\(/g },
	{ label: 'transaction_calls', pattern: /\bdb\.[\s\S]{0,160}?\.transaction\(/g }
];

function classifyLayer(relativeFile: string): AuditLayer {
	if (
		relativeFile.endsWith('/src/lib/server/db/runtime-read-repository.sqlite.ts') ||
		relativeFile.endsWith('/src/lib/server/db/runtime-write-repository.sqlite.ts') ||
		relativeFile.endsWith('/src/lib/server/db/schema.ts') ||
		relativeFile.endsWith('/tests/unit/test-db.ts') ||
		relativeFile.endsWith('/src/lib/server/db/client.ts') ||
		relativeFile.endsWith('/src/lib/server/db/migrate.ts') ||
		relativeFile.endsWith('/src/lib/server/db/seed-demo.ts') ||
		relativeFile.endsWith('/src/lib/server/sync/importer-sync.ts')
	) {
		return 'unit_test_harness';
	}
	if (relativeFile.includes('/src/lib/server/db/runtime-')) {
		return 'runtime_boundary';
	}
	if (
		relativeFile.includes('/src/lib/server/services/') ||
		relativeFile.endsWith('/src/lib/server/auth.ts')
	) {
		return 'service_surface';
	}
	if (relativeFile.includes('/src/routes/')) {
		return 'route_surface';
	}
	if (
		relativeFile.includes('/src/lib/server/db/') ||
		relativeFile.includes('/src/lib/server/sync/') ||
		relativeFile.includes('/scripts/')
	) {
		return 'runtime_infra';
	}
	if (relativeFile.includes('/src/lib/')) {
		return 'ui_support';
	}
	return 'other';
}

function isBoundaryManaged(relativeFile: string) {
	return (
		relativeFile.includes('/src/lib/server/db/runtime-gateway.ts') ||
		relativeFile.includes('/src/lib/server/db/runtime-read-repository.ts') ||
		relativeFile.includes('/src/lib/server/db/runtime-write-repository.ts') ||
		relativeFile.includes('/src/lib/server/db/runtime-query-repository.ts')
	);
}

function sumMatches(items: Finding[], label: string) {
	return items.reduce((sum, item) => sum + Number(item.counts[label] ?? 0), 0);
}

function walk(dir: string): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	return entries.flatMap((entry) => {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			return walk(fullPath);
		}
		return fullPath.endsWith('.ts') || fullPath.endsWith('.svelte') ? [fullPath] : [];
	});
}

const files = walk(root);
const findings = files
	.map((file) => {
		const text = fs.readFileSync(file, 'utf8');
		const relativeFile = path.relative(path.resolve(process.cwd(), '..'), file).replaceAll('\\', '/');
		const counts = Object.fromEntries(
			matchGroups.map((group) => [group.label, (text.match(group.pattern) ?? []).length])
		);
		const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
		return total > 0
			? {
					file: relativeFile,
					layer: classifyLayer(relativeFile),
					boundaryManaged: isBoundaryManaged(relativeFile),
					counts,
					total
				}
			: null;
	})
	.filter(Boolean) as Finding[];

const layerSummaries = Object.fromEntries(
	(
		[
			'runtime_boundary',
			'unit_test_harness',
			'service_surface',
			'route_surface',
			'runtime_infra',
			'ui_support',
			'other'
		] as AuditLayer[]
	).map(
		(layer) => {
			const layerFindings = findings.filter((item) => item.layer === layer);
			return [
				layer,
				{
					affectedFileCount: layerFindings.length,
					matchTotals: Object.fromEntries(
						matchGroups.map((group) => [group.label, sumMatches(layerFindings, group.label)])
					)
				}
			];
		}
	)
);

const liveCutoverFindings = findings
	.filter((item) => item.layer !== 'unit_test_harness')
	.sort((left, right) => right.total - left.total);
const directSurfaceFindings = findings
	.filter((item) => item.layer === 'service_surface' || item.layer === 'route_surface')
	.sort((left, right) => right.total - left.total);
const boundaryManagedFindings = findings
	.filter((item) => item.boundaryManaged)
	.sort((left, right) => right.total - left.total);
const topDirectSyncHotspots = directSurfaceFindings.slice(0, 10).map((item) => ({
	file: item.file,
	layer: item.layer,
	total: item.total,
	counts: item.counts
}));

const summary = {
	scope: 'app-runtime-postgres-cutover',
	fileCount: files.length,
	affectedFileCount: findings.length,
	liveCutoverAffectedFileCount: liveCutoverFindings.length,
	matchTotals: Object.fromEntries(
		matchGroups.map((group) => [
			group.label,
			sumMatches(findings, group.label)
		])
	),
	liveCutoverMatchTotals: Object.fromEntries(
		matchGroups.map((group) => [group.label, sumMatches(liveCutoverFindings, group.label)])
	),
	layerSummaries,
	boundaryManagedFileCount: boundaryManagedFindings.length,
	directSyncSurface: {
		affectedFileCount: directSurfaceFindings.length,
		matchTotals: Object.fromEntries(
			matchGroups.map((group) => [group.label, sumMatches(directSurfaceFindings, group.label)])
		),
		topHotspots: topDirectSyncHotspots
	},
	findings
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(summary, null, 2));
