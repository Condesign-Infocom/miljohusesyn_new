import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import type { AppDb } from '$lib/server/db/client';
import { createRuntimeGateway } from '$lib/server/db/runtime-gateway';
import { withDomainStoreClient } from '$lib/server/domain-store/client';
import { createContentStudioRepository } from '$lib/server/domain-store/content-studio-repository';
import { normalizePublicBodyHtml } from './public-content-format';
import { canViewQuestion, canViewSection, loadVisibilityContext } from './visibility';
import { resolveChromePath } from './chrome-path';

type StandardContentBlock = {
	blockId: string | null;
	title: string;
	contentType: string;
	bodyHtml: string;
	targets: string[];
};

type FullBookQuestion = {
	nodeId: string;
	prefix: string;
	questionText: string;
	flags: string[];
	factKeys: string[];
	answer: {
		responseValue: 'yes' | 'no' | 'na' | 'blank';
		comment: string;
		dueDate: string | null;
	};
};

type FullBookGroup = {
	nodeId: string;
	title: string;
	introText: string;
	questions: FullBookQuestion[];
};

type FullBookChecklist = {
	slug: string;
	title: string;
	groups: FullBookGroup[];
};

type FullBookFact = {
	key: string;
	factId: string;
	nodeId: string;
	title: string;
	bodyHtml: string;
	questionRefs: Array<{ prefix: string; questionText: string; checklistTitle: string }>;
};

type FullBookReport = {
	title: string;
	userDisplayName: string;
	companyName: string;
	renderDate: string;
	mode: 'complete' | 'user-full';
	checklists: FullBookChecklist[];
	facts: FullBookFact[];
	orderedTargets: string[];
	standardBlocks: StandardContentBlock[];
	warnings: string[];
};

type TocEntry = {
	label: string;
	href: string;
	isSubentry?: boolean;
};

const projectRoot = process.cwd();
const workspaceRoot = path.resolve(projectRoot, '..', '..');
const exportOutputRoot = path.join(
	workspaceRoot,
	'new-system',
	'publishing',
	'outputs',
	'app-exports'
);
const staticRoot = path.join(projectRoot, 'static');
const brandAssetRoot = path.join(staticRoot, 'brand');
const localLegacyPdfAssetRoot = path.join(staticRoot, 'pdf-assets', 'legacy');
const legacyFoAssetRoot = path.join(
	workspaceRoot,
	'miljohusesyn-lrfmhsrhs',
	'system',
	'mhs',
	'xslfo'
);
const pagedJsUrl = 'https://unpkg.com/pagedjs/dist/paged.polyfill.js';
const checklistOrder = ['miljohusesyn-g', 'miljohusesyn-v', 'miljohusesyn-d', 'miljohusesyn-a'];
const canonicalRootTargetOrder = [
	'id-preface1',
	'id-preface2',
	'id-checklists',
	'id-facts',
	'id-app1',
	'id-app2',
	'id-app3',
	'id-journal',
	'id-plan',
	'id-gloss'
];

export async function generateChecklistCompleteBookHtmlPdf(
	db: AppDb,
	checklistSlug: string,
	userId: number,
	mode: 'complete' | 'user-full' = 'complete'
) {
	if (!['miljohusesyn', 'grundvillkor', 'nya-fragor'].includes(checklistSlug)) {
		return null;
	}

	const runtimeGateway = createRuntimeGateway(db);
	const [checklistList, user, standardContent, visibilityContext] = await Promise.all([
		runtimeGateway.loadChecklistListQuery(userId),
		runtimeGateway.findUserById(userId),
		loadStandardContentBlocks(),
		mode === 'complete' ? Promise.resolve(null) : loadVisibilityContext(db, userId)
	]);

	if (!user) {
		return null;
	}

	const assignedChecklistIds = checklistList.assignedChecklistIds;
	const selectedChecklists =
		mode === 'complete' ?
			checklistOrder
				.map((slug) => checklistList.data.checklists.find((entry) => entry.slug === slug))
				.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
		:	checklistList.data.checklists
				.filter((entry) => assignedChecklistIds.has(entry.id))
				.sort((left, right) => {
					const leftIndex = checklistOrder.indexOf(left.slug);
					const rightIndex = checklistOrder.indexOf(right.slug);
					return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
				});

	if (selectedChecklists.length === 0) {
		return null;
	}

	const bundles = (
		await Promise.all(
			selectedChecklists.map(async (checklist) => {
				const { sourceData } = await runtimeGateway.loadPublicationPlanQuery(
					checklist.slug,
					userId,
					mode
				);

				if (!sourceData.checklist) {
					return null;
				}

				return {
					checklist: sourceData.checklist,
					sections: sourceData.sections,
					questionGroups: sourceData.questionGroups,
					questions: sourceData.questions,
					factLinks: sourceData.factLinks,
					facts: sourceData.facts,
					answers: sourceData.answers,
					questionProfiles: sourceData.questionProfiles,
					sectionProfiles: sourceData.sectionProfiles
				};
			})
		)
	).filter((bundle): bundle is NonNullable<typeof bundle> => bundle !== null);

	if (bundles.length === 0) {
		return null;
	}

	const factsById = new Map(
		bundles.flatMap((bundle) => bundle.facts).map((fact) => [fact.id, fact] as const)
	);
	const factMap = new Map<string, FullBookFact>();
	const checklists: FullBookChecklist[] = [];

	for (const bundle of bundles) {
		for (const fact of bundle.facts) {
			const factKey = `${fact.factId || fact.nodeId || String(fact.id)}`.trim();
			if (!factKey || factMap.has(factKey)) {
				continue;
			}

			factMap.set(factKey, {
				key: factKey,
				factId: fact.factId,
				nodeId: fact.nodeId,
				title: fact.title,
				bodyHtml: rewriteStaticAssetUrls(normalizePublicBodyHtml(fact.bodyHtml)),
				questionRefs: []
			});
		}

		const groupsBySection = new Map<number, Array<(typeof bundle.questionGroups)[number]>>();
		for (const group of bundle.questionGroups) {
			const bucket = groupsBySection.get(group.sectionId) ?? [];
			bucket.push(group);
			groupsBySection.set(group.sectionId, bucket);
		}

		const questionsByGroup = new Map<number, Array<(typeof bundle.questions)[number]>>();
		for (const question of bundle.questions) {
			const bucket = questionsByGroup.get(question.groupId) ?? [];
			bucket.push(question);
			questionsByGroup.set(question.groupId, bucket);
		}

		const factLinksByQuestion = new Map<number, Array<(typeof bundle.factLinks)[number]>>();
		for (const link of bundle.factLinks) {
			const bucket = factLinksByQuestion.get(link.questionId) ?? [];
			bucket.push(link);
			factLinksByQuestion.set(link.questionId, bucket);
		}

		const answersByQuestion = new Map(bundle.answers.map((answer) => [answer.questionId, answer]));
		const questionProfilesByQuestion = buildProfileMap(bundle.questionProfiles, 'questionId');
		const sectionProfilesBySection = buildProfileMap(bundle.sectionProfiles, 'sectionId');

		const groups = bundle.sections
			.slice()
			.sort((left, right) => left.sortOrder - right.sortOrder)
			.filter((section) =>
				mode === 'complete' ? true : canViewSection(visibilityContext, sectionProfilesBySection.get(section.id) ?? [])
			)
			.map((section) => {
				const sectionQuestions = (groupsBySection.get(section.id) ?? [])
					.slice()
					.sort((left, right) => left.sortOrder - right.sortOrder)
					.flatMap((group) =>
						(questionsByGroup.get(group.id) ?? [])
							.slice()
							.sort((left, right) => left.sortOrder - right.sortOrder)
					);

				const questions = sectionQuestions
					.filter((question) =>
						mode === 'complete' ?
							true
						:	canViewQuestion(
								visibilityContext,
								questionProfilesByQuestion.get(question.id) ?? [],
								question.questionText
							)
					)
					.map((question) => {
					const linkRows = factLinksByQuestion.get(question.id) ?? [];
					const factKeys: string[] = [];

					for (const link of linkRows) {
						const fact = factsById.get(link.factId);
						if (!fact) {
							continue;
						}

						const factKey = `${fact.factId || fact.nodeId || String(fact.id)}`.trim();
						if (!factKey) {
							continue;
						}

						if (!factMap.has(factKey)) {
							factMap.set(factKey, {
								key: factKey,
								factId: fact.factId,
								nodeId: fact.nodeId,
								title: fact.title,
								bodyHtml: rewriteStaticAssetUrls(normalizePublicBodyHtml(fact.bodyHtml)),
								questionRefs: []
							});
						}

						const factEntry = factMap.get(factKey)!;
						const alreadyLinked = factEntry.questionRefs.some(
							(entry) =>
								entry.prefix === question.prefix &&
								entry.questionText === question.questionText &&
								entry.checklistTitle === bundle.checklist.title
						);

						if (!alreadyLinked) {
							factEntry.questionRefs.push({
								prefix: question.prefix,
								questionText: question.questionText,
								checklistTitle: bundle.checklist.title
							});
						}

						if (!factKeys.includes(factKey)) {
							factKeys.push(factKey);
						}
					}

					return {
						nodeId: question.nodeId,
						prefix: question.prefix,
						questionText: question.questionText,
						flags: questionFlags(question),
						factKeys,
						answer: {
							responseValue: normalizeAnswerValue(answersByQuestion.get(question.id)?.responseValue),
							comment: answersByQuestion.get(question.id)?.comment ?? '',
							dueDate: answersByQuestion.get(question.id)?.dueDate ?? null
						}
					} satisfies FullBookQuestion;
				});

				return {
					nodeId: section.nodeId,
					title: section.title,
					introText: section.description,
					questions
				} satisfies FullBookGroup;
			})
			.filter((group) => group.questions.length > 0);

		checklists.push({
			slug: bundle.checklist.slug,
			title: bundle.checklist.title,
			groups
		});
	}

	for (const fact of factMap.values()) {
		fact.questionRefs.sort(
			(left, right) =>
				left.checklistTitle.localeCompare(right.checklistTitle, 'sv') ||
				left.prefix.localeCompare(right.prefix, 'sv')
		);
	}

	const facts = Array.from(factMap.values()).sort(
		(left, right) =>
			left.questionRefs[0]?.prefix.localeCompare(right.questionRefs[0]?.prefix ?? '', 'sv') ||
			left.title.localeCompare(right.title, 'sv')
	);

	const standardRowsByBlockId = new Map(
		standardContent.rows
			.filter((row) => row.blockId)
			.map((row) => [row.blockId!, { ...row, bodyHtml: rewriteStaticAssetUrls(normalizePublicBodyHtml(row.bodyHtml)) }] as const)
	);
	const orderedTargets = extractOrderedTargets(standardContent.rootAssembly?.targets ?? []);
	const warnings: string[] = [];

	if (!standardContent.rootAssembly) {
		warnings.push('Root assembly block (mhs-root) was not found in the durable content store.');
	}

	for (const target of orderedTargets) {
		if (isGeneratedTarget(target)) {
			continue;
		}
		if (!standardRowsByBlockId.has(target)) {
			warnings.push(`Standard content block ${target} was referenced by root assembly but not found.`);
		}
	}

	const report: FullBookReport = {
		title: 'Miljöhusesyn 2026',
		userDisplayName: user.displayName,
		companyName: user.companyName || user.displayName,
		renderDate: new Date().toISOString().slice(0, 10),
		mode,
		checklists,
		facts,
		orderedTargets,
		standardBlocks: [
			...orderedTargets
				.map((target) => standardRowsByBlockId.get(target))
				.filter((row): row is StandardContentBlock => Boolean(row)),
			...standardContent.rows.filter(
				(row) =>
					row.contentType === 'common-standard-text' &&
					(!row.blockId || !orderedTargets.includes(row.blockId))
			)
		],
		warnings
	};

	const exportId = `miljohusesyn-html-${mode}-${Date.now()}-${randomUUID().slice(0, 8)}`;
	const outputDir = path.join(exportOutputRoot, exportId);
	const htmlPath = path.join(outputDir, 'mhs-root-app.html');
	const outputPdf = path.join(outputDir, 'mhs-root-app.html.generated.pdf');
	const reportPath = path.join(outputDir, 'pdf-render-report.json');

	await fs.mkdir(outputDir, { recursive: true });
	await fs.writeFile(htmlPath, renderCompleteBookHtml(report), 'utf8');

	const chromePath = await resolveChromePath();
	if (!chromePath) {
		throw new Error('Could not locate a Chrome-compatible browser for the HTML full-book PDF renderer.');
	}

	const args = [
		'--headless=new',
		'--disable-gpu',
		'--allow-file-access-from-files',
		'--enable-local-file-accesses',
		'--run-all-compositor-stages-before-draw',
		'--virtual-time-budget=20000',
		'--no-pdf-header-footer',
		'--print-to-pdf-no-header',
		`--print-to-pdf=${outputPdf}`,
		pathToFileURL(htmlPath).href
	];
	const render = await runProcess(chromePath, args, outputDir);

	const reportPayload = {
		slug: checklistSlug,
		title: report.title,
		userDisplayName: report.userDisplayName,
		companyName: report.companyName,
		renderer:
			mode === 'complete' ?
				'Headless Chrome + paged.js HTML complete-book prototype'
			:	'Headless Chrome + paged.js HTML user-book prototype',
		htmlPath,
		outputPdf,
		returnCode: render.code,
		stdout: render.stdout,
		stderr: render.stderr,
		counts: {
			checklists: report.checklists.length,
			groups: report.checklists.reduce((sum, checklist) => sum + checklist.groups.length, 0),
			questions: report.checklists.reduce(
				(sum, checklist) =>
					sum + checklist.groups.reduce((groupSum, group) => groupSum + group.questions.length, 0),
				0
			),
			facts: report.facts.length,
			standardBlocks: report.standardBlocks.length
		},
		orderedTargets: report.orderedTargets,
		warnings: report.warnings,
		status: render.code === 0 ? 'rendered' : 'failed'
	};
	await fs.writeFile(reportPath, JSON.stringify(reportPayload, null, 2), 'utf8');

	if (render.code !== 0) {
		throw new Error(`HTML full-book PDF renderer exited with code ${render.code ?? 'unknown'}.`);
	}

	await waitForFile(outputPdf);

	return {
		filename: mode === 'complete' ? 'miljohusesyn-complete-html.pdf' : 'miljohusesyn-user-full-html.pdf',
		contentType: 'application/pdf' as const,
		pdfPath: outputPdf,
		reportPath
	};
}

async function loadStandardContentBlocks() {
	return await withDomainStoreClient(async (client) => {
		const repository = createContentStudioRepository(client);
		const latestSnapshot = await repository.findLatestSnapshot();

		if (!latestSnapshot) {
			return {
				rows: [] as StandardContentBlock[],
				rootAssembly: null as StandardContentBlock | null
			};
		}

		const rows = (await repository.listStandardContentRows({ snapshotId: latestSnapshot.id })).map((row) => ({
			blockId: row.blockId,
			title: row.title,
			contentType: row.contentType,
			bodyHtml: row.bodyHtml,
			targets: row.targets
		}));

		return {
			rows,
			rootAssembly: rows.find((row) => row.contentType === 'root-assembly' || row.title === 'mhs-root') ?? null
		};
	});
}

function extractOrderedTargets(targets: string[]) {
	const discoveredTargets = targets
		.map((target) => target.split('#')[1]?.trim() ?? '')
		.filter((target) => Boolean(target) && target !== 'id-user-info');

	const orderedTargets = canonicalRootTargetOrder.filter((target) => discoveredTargets.includes(target));
	const remainingTargets = discoveredTargets.filter((target) => !orderedTargets.includes(target));
	return [...orderedTargets, ...remainingTargets];
}

function isGeneratedTarget(target: string) {
	return target === 'id-checklists' || target === 'id-facts';
}

function renderCompleteBookHtml(report: FullBookReport) {
	return `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(report.title)} - fullbok</title>
    <script>
      window.PagedConfig = { auto: false };
    </script>
    <script src="${pagedJsUrl}"></script>
    <script>
      window.addEventListener('load', () => {
        const finish = () => {
          document.body.dataset.renderReady = 'true';
        };
        if (window.PagedPolyfill && typeof window.PagedPolyfill.preview === 'function') {
          window.PagedPolyfill.preview().then(finish).catch(finish);
          return;
        }
        finish();
      });
    </script>
    <style>
      @page {
        size: A4 portrait;
        margin: 15mm 25mm 9mm 20mm;
      }

      @page :left {
        margin: 15mm 20mm 9mm 25mm;
      }

      @page cover {
        size: A4 portrait;
        margin: 7mm;
      }

      @page checklist {
        size: A4 portrait;
        margin: 12mm 8mm 9mm 8mm;
      }

      :root {
        color-scheme: light;
        --ink: #222222;
        --muted: #5f5f5f;
        --line: #8a8a8a;
        --soft-line: #d3d3d3;
        --accent: #007f67;
        --accent-soft: #d5e3d7;
        --cover-accent: #f49a0d;
        --cover-accent-soft: #f6b653;
        --paper: #ffffff;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: var(--ink);
        background: white;
        font-family: "Adobe Garamond Pro", Garamond, Georgia, serif;
        font-size: 9pt;
        line-height: 1.42;
        counter-reset: page;
      }

      .page-footer {
        position: fixed;
        left: 20mm;
        right: 20mm;
        display: grid;
        grid-template-columns: 25mm 1fr 40mm;
        align-items: center;
        color: var(--muted);
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 5.5pt;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        z-index: 5;
      }

      .page-footer {
        bottom: 3.5mm;
      }

      .page-footer-page::after {
        content: counter(page);
      }

      .page-footer-page {
        font-size: 8pt;
        font-weight: 700;
      }

      .page-footer-center {
        text-align: center;
      }

      .page-footer-date {
        text-align: right;
        font-weight: 700;
      }

      main {
        display: grid;
        gap: 0;
        padding: 0 0 12mm;
      }

      .cover {
        page: cover;
        min-height: 283mm;
        display: grid;
        grid-template-rows: auto 1fr;
        gap: 0;
        page-break-after: always;
        position: relative;
        z-index: 10;
        overflow: hidden;
      }

      .cover::after {
        content: "";
        position: absolute;
        left: -7mm;
        right: -7mm;
        bottom: -16mm;
        height: 30mm;
        background: white;
        z-index: 30;
      }

      .cover.cover-user {
        grid-template-rows: auto auto 1fr;
      }

      .toc-page {
        break-before: page;
        display: grid;
        gap: 6mm;
      }

      .toc-hero {
        display: grid;
        justify-items: start;
      }

      .toc-hero img {
        width: 132mm;
        max-width: 100%;
        height: auto;
      }

      .toc-title {
        margin: 0;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 12pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .toc-columns {
        column-count: 2;
        column-gap: 7mm;
      }

      .toc-entry,
      .toc-group-heading {
        display: flex;
        align-items: baseline;
        gap: 2mm;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 7.5pt;
        line-height: 1.22;
        break-inside: avoid;
        color: inherit;
        text-decoration: none;
      }

      .toc-entry {
        margin: 0 0 0.75mm;
      }

      .toc-group-heading {
        margin: 3.6mm 0 1mm;
        padding-bottom: 0.6mm;
        border-bottom: 1.3pt solid #2f2f2f;
        font-weight: 700;
        text-transform: uppercase;
      }

      .toc-group-heading .toc-dots {
        display: none;
      }

      .toc-subentry {
        margin-left: 8mm;
      }

      .toc-dots {
        flex: 1 1 auto;
        border-bottom: 1px dotted #8f8f8f;
        transform: translateY(-1px);
      }

      .toc-page-number {
        min-width: 4mm;
        text-align: right;
      }

      .toc-page-number::after {
        content: target-counter(attr(data-target url), page);
      }

      .brand-lockup {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: end;
        gap: 7mm;
        min-height: 25mm;
      }

      .brand-lockup img {
        width: 69mm;
        height: auto;
      }

      .cover-year {
        margin: 0 3mm 2mm 0;
        color: var(--cover-accent-soft);
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 13.5pt;
        font-weight: 300;
      }

      h1 {
        margin: 0;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 35pt;
        line-height: 1;
        font-weight: 300;
        color: var(--accent);
      }

      .cover-member {
        margin: 1mm 1mm 0;
        background: var(--cover-accent);
        color: white;
        text-align: center;
        padding: 6mm 8mm 5mm;
      }

      .cover-member-label {
        margin: 0 0 2mm;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 9pt;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .cover-member-name {
        margin: 0 0 2mm;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 30pt;
        line-height: 1;
        font-weight: 300;
      }

      .cover-member-subtitle {
        margin: 0;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 16pt;
        line-height: 1.1;
        font-weight: 300;
      }

      .cover-image {
        min-height: 0;
        display: grid;
        align-items: stretch;
        margin-top: 4mm;
      }

      .cover-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center;
      }

      .cover.cover-complete .cover-image {
        margin-top: 4mm;
        min-height: 239mm;
      }

      .cover.cover-complete .cover-image img {
        object-fit: cover;
        object-position: center top;
      }

      .cover.cover-complete .brand-lockup {
        min-height: 23mm;
      }

      .cover.cover-complete .cover-year {
        margin-bottom: 2mm;
      }

      .eyebrow {
        margin: 0;
        color: var(--accent);
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 8pt;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .section-block {
        break-before: page;
        display: grid;
        gap: 5mm;
        padding-top: 0;
      }

      .section-heading {
        display: grid;
        gap: 1.5mm;
        padding-bottom: 4mm;
        border-bottom: 2pt solid var(--accent);
      }

      .section-heading h2 {
        margin: 0;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 35pt;
        line-height: 1;
        font-weight: 300;
        color: var(--accent);
      }

      .section-heading p {
        margin: 0;
        color: var(--muted);
      }

      .preface-section .section-heading h2,
      .appendix-section .section-heading h2,
      .journal-section .section-heading h2,
      .plan-section .section-heading h2,
      .glossary-section .section-heading h2 {
        font-size: 28pt;
      }

      .preface-section {
        gap: 3mm;
      }

      .preface-section .section-heading {
        gap: 0;
        padding-bottom: 2.4mm;
        border-bottom: 1.5pt solid #b2b100;
      }

      .preface-section .eyebrow {
        display: none;
      }

      .preface-section .section-heading h2 {
        font-size: 34pt;
        font-weight: 300;
        color: #b2b100;
        letter-spacing: 0.01em;
      }

      .preface-section .rich-text {
        margin-top: 0;
        font-size: 8.7pt;
        line-height: 1.31;
        column-gap: 5.5mm;
      }

      .preface-section .rich-text h2 {
        margin: 0 0 1.8mm;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 12.4pt;
        line-height: 1.12;
        font-weight: 700;
        color: #b2b100;
        border-bottom: 1pt solid #b2b100;
        padding-bottom: 1mm;
        break-after: avoid;
      }

      .preface-section .rich-text p {
        margin: 0 0 1.6mm;
      }

      .preface-section .rich-text ul,
      .preface-section .rich-text ol {
        margin: 0 0 2mm 4.2mm;
      }

      .preface-section .rich-text li + li {
        margin-top: 0.8mm;
      }

      .preface-followup {
        break-before: page;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 79mm;
        gap: 6mm;
        align-items: start;
      }

      .preface-followup-body {
        padding-top: 2.5mm;
        font-size: 8.5pt;
        line-height: 1.29;
      }

      .preface-followup-body h2 {
        margin: 0 0 1.8mm;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 12.4pt;
        line-height: 1.12;
        font-weight: 700;
        color: #b2b100;
        border-bottom: 1pt solid #b2b100;
        padding-bottom: 1mm;
      }

      .preface-followup-body p {
        margin: 0 0 1.6mm;
      }

      .appendix-section .rich-text,
      .journal-section .rich-text,
      .plan-section .rich-text,
      .glossary-section .rich-text {
        column-count: 1;
      }

      .embedded-glossary {
        margin-top: 3mm;
        padding: 3.2mm 4.4mm;
        background: #d7e2d4;
        break-inside: avoid;
        max-width: 88mm;
        margin-left: auto;
      }

      .embedded-glossary-heading {
        margin: 0 0 2mm;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 8pt;
        font-style: italic;
        font-weight: 700;
      }

      .embedded-glossary-body {
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 8pt;
        line-height: 11pt;
      }

      .embedded-glossary-body > :first-child {
        margin-top: 0;
      }

      .embedded-glossary-body > :last-child {
        margin-bottom: 0;
      }

      .preface-followup .embedded-glossary {
        margin-top: 7mm;
        padding: 3.8mm 4.8mm 4.2mm;
        background: #b5b317;
        color: #1d1d1d;
        max-width: 79mm;
      }

      .preface-followup .embedded-glossary-heading {
        margin-bottom: 2.3mm;
        font-size: 8.2pt;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .preface-followup .embedded-glossary-body {
        font-size: 7.75pt;
        line-height: 1.45;
        font-style: italic;
        font-weight: 700;
      }

      .rich-text > :first-child,
      .fact-body > :first-child {
        margin-top: 0;
      }

      .rich-text > :last-child,
      .fact-body > :last-child {
        margin-bottom: 0;
      }

      .rich-text {
        column-count: 2;
        column-gap: 5mm;
        column-fill: auto;
        font-size: 9.2pt;
        line-height: 1.46;
      }

      .rich-text p,
      .fact-body p {
        margin: 0 0 2.1mm;
      }

      .rich-text ul,
      .rich-text ol,
      .fact-body ul,
      .fact-body ol {
        margin: 0 0 2.5mm 5mm;
        padding: 0;
      }

      .rich-text figure,
      .fact-body figure {
        margin: 3mm 0;
        break-inside: avoid;
      }

      .rich-text img,
      .fact-body img {
        display: block;
        max-width: 100%;
        height: auto;
      }

      .checklist-chapter {
        display: grid;
        gap: 3mm;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
      }

      .checklists-section {
        page: checklist;
        gap: 4mm;
      }

      .checklist-title {
        margin: 0;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 23pt;
        line-height: 1.05;
        font-weight: 300;
        color: var(--accent);
        padding-top: 1mm;
      }

      .checklist-chapter + .checklist-chapter .checklist-title {
        page-break-before: always;
      }

      .group {
        display: grid;
        gap: 0;
        break-inside: avoid;
      }

      .group h4 {
        margin: 0;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 10pt;
        line-height: 1.2;
        font-weight: 700;
      }

      .group-intro {
        margin: 0;
        color: var(--muted);
        font-size: 8.4pt;
        line-height: 1.34;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-style: italic;
        font-weight: 700;
        padding: 2.4mm 3pt 0.6mm 19mm;
      }

      .question-list {
        display: grid;
        gap: 0;
      }

      .group + .group {
        margin-top: 2mm;
      }

      .question-row {
        display: grid;
        grid-template-columns: 12mm minmax(0, 1fr) 7.5mm 7.5mm 7.5mm 21mm;
        align-items: start;
        min-height: 7.2mm;
        border-top: 0.5pt solid var(--line);
        border-right: 0.5pt solid var(--line);
        border-bottom: 0.5pt solid var(--line);
        break-inside: avoid;
      }

      .question-prefix-cell,
      .question-text-cell,
      .answer-cell,
      .answer-date-cell {
        min-height: 100%;
        padding: 4pt 2pt 1.5pt;
      }

      .group-heading-row {
        min-height: 7.4mm;
      }

      .group-heading-row .question-prefix,
      .group-heading-row h4 {
        font-size: 10pt;
      }

      .question-prefix-cell {
        border-right: 0.5pt solid var(--line);
        text-align: right;
      }

      .question-text-cell {
        border-right: 0.5pt solid var(--line);
      }

      .answer-cell {
        display: grid;
        place-items: start center;
        border-right: 0.5pt solid var(--line);
        text-align: center;
        background: #eef0ec;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
      }

      .answer-date-cell {
        display: grid;
        place-items: start center;
        text-align: center;
        background: #f7f7f6;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
      }

      .answer-cell.active-yes {
        background: #edf5f1;
      }

      .answer-cell.active-no {
        background: #f8efe5;
      }

      .answer-cell.active-na {
        background: #eef1f3;
      }

      .question-flags {
        display: block;
        margin-top: 1mm;
        color: var(--muted);
        font-size: 6.5pt;
        line-height: 1.2;
      }

      .question-prefix {
        color: var(--ink);
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 8pt;
        font-weight: 700;
      }

      .question-text {
        margin: 0;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 7.9pt;
        line-height: 1.22;
        white-space: pre-line;
      }

      .question-answer-mark {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        width: 5.1mm;
        height: 5.1mm;
        border: 1.1pt solid #676767;
        border-radius: 0.35mm;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 6.6pt;
        line-height: 1;
        font-weight: 700;
        color: #1f1f1f;
        background: white;
      }

      .question-answer-mark.yes {
        color: #1f1f1f;
        border-color: #3b6d61;
        background: #ffffff;
      }

      .question-answer-mark.no {
        color: #1f1f1f;
        border-color: #8a6130;
        background: #ffffff;
      }

      .question-answer-mark.na {
        color: #1f1f1f;
        border-color: #70777b;
        background: #ffffff;
      }

      .question-answer-mark.blank {
        color: transparent;
        border-color: #7f7f7f;
        background: #ffffff;
      }

      .question-answer-date {
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 7.6pt;
        line-height: 1.15;
      }

      .question-comment {
        grid-column: 2 / span 5;
        padding: 0 3pt 4pt;
        color: var(--muted);
        font-size: 7.5pt;
        line-height: 1.3;
        font-style: italic;
      }

      .checklist-legend {
        display: grid;
        grid-template-columns: 12mm minmax(0, 1fr) 7.5mm 7.5mm 7.5mm 21mm;
        width: 100%;
        border-top: 0.5pt solid var(--line);
        margin-top: 3pt;
        background: #f1f2ef;
      }

      .legend-empty,
      .legend-cell {
        padding: 4pt 2pt 1.5pt;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 7.2pt;
        font-weight: 700;
        text-align: center;
      }

      .legend-empty {
        border-right: 0.5pt solid var(--line);
      }

      .legend-cell {
        border-right: 0.5pt solid var(--line);
      }

      .legend-cell:last-child {
        border-right: 0;
      }

      .legend-cell.answer-legend {
        background: #eaede7;
      }

      .due-date-legend {
        font-size: 5.6pt;
        line-height: 1;
        letter-spacing: 0;
        white-space: nowrap;
      }

      .due-date-label {
        display: inline-block;
        white-space: nowrap;
      }

      .answer-row {
        display: flex;
        flex-wrap: wrap;
        gap: 2mm;
        align-items: center;
      }

      .answer-chip {
        display: inline-flex;
        align-items: center;
        padding: 0.8mm 2mm;
        border-radius: 999px;
        font-size: 8.5px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .answer-chip.yes {
        background: #e3f3ec;
        color: #0d6a4b;
      }

      .answer-chip.no {
        background: #fde8e1;
        color: #b14917;
      }

      .answer-chip.na {
        background: #eceff1;
        color: #516066;
      }

      .answer-chip.blank {
        background: #fff4d9;
        color: #8d6110;
      }

      .answer-meta {
        color: var(--muted);
        font-size: 9px;
      }

      .answer-comment {
        margin: 0;
        padding: 2mm 2.5mm;
        border-left: 2px solid var(--line);
        background: white;
        color: var(--muted);
        font-size: 9.5px;
      }

      .fact-list {
        display: grid;
        gap: 1mm;
      }

      .facts-section {
        gap: 4mm;
      }

      .facts-section .section-heading {
        padding-bottom: 3mm;
      }

      .fact-entry {
        break-inside: auto;
        page-break-inside: auto;
        display: grid;
        width: 100%;
        gap: 1.8mm;
        margin: 0 0 5.5mm;
        padding: 0;
        border: 0;
        background: transparent;
      }

      .fact-entry h4 {
        margin: 0;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 23pt;
        line-height: 1.05;
        font-weight: 700;
        color: var(--accent);
        border-bottom: 2pt solid var(--accent);
        padding-bottom: 2mm;
      }

      .fact-meta {
        color: var(--muted);
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 8pt;
      }

      .fact-links {
        display: flex;
        flex-wrap: wrap;
        gap: 1.2mm;
        margin-top: -0.5mm;
      }

      .fact-link-chip {
        display: inline-flex;
        padding: 0;
        border: 0;
        background: transparent;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 6.5pt;
        color: var(--muted);
      }

      .fact-body {
        column-count: 2;
        column-gap: 5mm;
        column-fill: auto;
        font-size: 9pt;
        line-height: 1.42;
      }

      .fact-standard-block .fact-body h1 {
        margin: 0 0 2mm;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 23pt;
        line-height: 1.05;
        font-weight: 700;
        color: var(--accent);
        border-bottom: 2pt solid var(--accent);
        padding-bottom: 2mm;
        column-span: all;
      }

      .fact-standard-block .fact-body h2 {
        margin: 0 0 1.8mm;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 16pt;
        line-height: 1.1;
        font-weight: 700;
        color: var(--ink);
      }

      .fact-body figure {
        column-span: all;
        margin: 3mm 0 4mm;
        text-align: center;
      }

      .fact-body figure img {
        margin: 0 auto;
        max-height: 78mm;
        width: auto;
      }

      .fact-body figcaption {
        margin-top: 1.5mm;
        color: var(--muted);
        font-size: 7pt;
        line-height: 1.25;
        text-align: left;
      }

      .fact-body table {
        width: 100%;
        margin: 3mm 0 4mm;
        border-collapse: collapse;
        break-inside: avoid;
        page-break-inside: avoid;
        font-size: 7.6pt;
        line-height: 1.3;
        column-span: all;
      }

      .fact-body th,
      .fact-body td {
        border: 0.5pt solid var(--soft-line);
        padding: 2pt 3pt;
        vertical-align: top;
      }

      .fact-body thead th {
        background: #f3f6f4;
        font-family: "Myriad Pro", "Gill Sans", "Trebuchet MS", Arial, sans-serif;
        font-size: 7.2pt;
        text-align: left;
      }

      .fact-body tr {
        break-inside: avoid;
      }

      .warnings {
        display: grid;
        gap: 2mm;
        padding: 4mm;
        border: 1px solid #e8c7a6;
        border-radius: 4mm;
        background: #fff5e8;
      }

      .warnings h3 {
        margin: 0;
        font-size: 12px;
      }

      .warnings ul {
        margin: 0;
        padding-left: 5mm;
      }
    </style>
  </head>
  <body>
    <div class="page-footer">
      <span class="page-footer-page"></span>
      <span class="page-footer-center">${escapeHtml(report.mode === 'complete' ? report.title : `${report.title} ${report.companyName}`)}</span>
      <span class="page-footer-date">${escapeHtml(report.renderDate)}</span>
    </div>
    <main>
      <section class="cover ${report.mode === 'complete' ? 'cover-complete' : 'cover-user'}">
        <div class="brand-lockup">
          <img src="${escapeHtml(resolveBrandLogoAssetHref())}" alt="Miljöhusesyn" />
          <p class="cover-year">${escapeHtml(report.mode === 'complete' ? report.renderDate : '2026')}</p>
        </div>
        ${
					report.mode === 'complete' ?
						''
					:	`<div class="cover-member">
          <p class="cover-member-label">${escapeHtml('Miljöhusesyn för')}</p>
          <p class="cover-member-name">${escapeHtml(report.companyName)}</p>
          <p class="cover-member-subtitle">${escapeHtml('Med ifyllda svar')}</p>
        </div>`
				}
        <div class="cover-image">
          <img src="${escapeHtml(resolveLegacyCoverImage(report.mode))}" alt="" />
        </div>
      </section>
      ${renderTocSection(report)}
      ${report.warnings.length > 0 ? renderWarnings(report.warnings) : ''}
      ${renderOrderedBookSections(report)}
    </main>
  </body>
</html>`;
}

function renderOrderedBookSections(report: FullBookReport) {
	const blocksById = new Map(
		report.standardBlocks
			.filter((block) => block.blockId)
			.map((block) => [block.blockId!, block] as const)
	);
	const glossaryBlock = report.standardBlocks.find((block) => block.contentType === 'glossary') ?? null;
	const commonFactBlocks = report.standardBlocks.filter(
		(block) => block.contentType === 'common-standard-text'
	);
	const appendixBlocks: StandardContentBlock[] = [];
	const sections: string[] = [];
	let glossaryRendered = false;

	for (const target of report.orderedTargets) {
		if (target === 'id-checklists') {
			sections.push(renderChecklistSection(report.checklists, report.mode));
			continue;
		}
		if (target === 'id-facts') {
			sections.push(renderFactsSection(report.facts, commonFactBlocks));
			continue;
		}
		if (target === 'id-gloss') {
			continue;
		}

		const block = blocksById.get(target);
		if (!block) {
			continue;
		}

		if (block.contentType === 'appendix' || block.contentType === 'journal' || block.contentType === 'plan') {
			appendixBlocks.push(block);
			continue;
		}

		if (block.contentType === 'preface') {
			const injectGlossary = !glossaryRendered ? glossaryBlock : null;
			sections.push(renderStandardContentBlock(block, { injectGlossary }));
			if (injectGlossary) {
				glossaryRendered = true;
			}
			continue;
		}

		sections.push(renderStandardContentBlock(block));
	}

	if (appendixBlocks.length > 0) {
		sections.push(renderAppendicesSection(appendixBlocks));
	}

	return sections.join('\n');
}

function renderTocSection(report: FullBookReport) {
	const prefaces = report.standardBlocks.filter((block) => block.contentType === 'preface');
	const commonFactBlocks = report.standardBlocks.filter(
		(block) => block.contentType === 'common-standard-text'
	);
	const appendices = report.standardBlocks.filter(
		(block) =>
			block.contentType === 'appendix' || block.contentType === 'journal' || block.contentType === 'plan'
	);

	const prefaceEntries = prefaces.flatMap((block) =>
		buildTocEntriesFromBlock(block, block.blockId === 'id-preface2' ? [2, 3] : [2])
	);
	const checklistEntries = report.checklists.flatMap((checklist) => [
		{ label: checklist.title, href: `#${checklistAnchorId(checklist)}` },
		...checklist.groups.map((group) => ({
			label: group.title,
			href: `#${groupAnchorId(group)}`,
			isSubentry: true
		}))
	]);
	const factEntries = commonFactBlocks.flatMap((block) => buildTocEntriesFromBlock(block, [2, 3]));
	const appendicesForToc = appendices.filter((block) =>
		['id-app3', 'id-journal', 'id-plan'].includes(block.blockId ?? '')
	);
	const appendixEntries = appendicesForToc.flatMap((block) => buildTocEntriesFromBlock(block, [2]));

	return `<section class="toc-page" id="toc-page">
        <div class="toc-hero">
          <img src="${escapeHtml(resolveIntroIllustrationAssetHref())}" alt="" />
        </div>
        <h2 class="toc-title">Innehållsförteckning</h2>
        <div class="toc-columns">
          ${renderTocEntry({ label: 'Innehållsförteckning', href: '#toc-page' })}
          ${renderTocGroup('Inledning', `#${prefaceSectionAnchorId(prefaces[0])}`, prefaceEntries)}
          ${renderTocGroup(
						'Checklista',
						checklistEntries.length > 0 ? checklistEntries[0].href : '#id-checklists',
						checklistEntries
					)}
          ${renderTocGroup('Faktadel', '#id-facts', factEntries)}
          ${renderTocGroup(
						'Bilagor',
						appendixEntries.length > 0 ? appendixEntries[0].href : '#id-plan',
						appendixEntries
					)}
        </div>
      </section>`;
}

function renderWarnings(warnings: string[]) {
	return `<section class="section-block warnings-section">
        <div class="warnings">
          <h3>Observera</h3>
          <ul>${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>
        </div>
      </section>`;
}

function renderChecklistSection(checklists: FullBookChecklist[], mode: FullBookReport['mode']) {
	return `<section class="section-block checklists-section" id="id-checklists">
        ${checklists
					.map(
						(checklist) => `<article class="checklist-chapter" id="${escapeHtml(checklistAnchorId(checklist))}">
              <h3 class="checklist-title">${escapeHtml(checklist.title)}</h3>
              <div class="checklist-legend">
                <div class="legend-empty"></div>
                <div class="legend-empty"></div>
                <div class="legend-cell answer-legend">Ja</div>
                <div class="legend-cell answer-legend">Nej</div>
                <div class="legend-cell answer-legend">EA</div>
                <div class="legend-cell due-date-legend"><span class="due-date-label">Åtgärdas senast</span></div>
              </div>
              ${checklist.groups
								.map(
									(group) => `<section class="group" id="${escapeHtml(groupAnchorId(group))}">
                  <div class="question-row group-heading-row" style="background:${groupBackgroundColor(checklist.slug)}">
                    <div class="question-prefix-cell"><span class="question-prefix">${escapeHtml(extractGroupPrefix(group.questions))}</span></div>
                    <div class="question-text-cell" style="grid-column: span 5">
                      <h4>${escapeHtml(group.title)}</h4>
                    </div>
                  </div>
                  <div class="question-list">
                    ${group.questions
											.map(
												(question) => `<article class="question-row qa-row">
                        <div class="question-prefix-cell">
                          <span class="question-prefix">${escapeHtml(question.prefix)}</span>
                        </div>
                        <div class="question-text-cell">
                          <p class="question-text">${escapeHtml(question.questionText)}</p>
                          ${question.flags.length > 0 ? `<span class="question-flags">${escapeHtml(question.flags.join(' · '))}</span>` : ''}
                        </div>
                        ${renderQuestionAnswer(question, mode)}
                      </article>`
											)
											.join('')}
                  </div>
                </section>`
								)
								.join('')}
            </article>`
					)
					.join('')}
      </section>`;
}

function renderQuestionAnswer(question: FullBookQuestion, mode: FullBookReport['mode']) {
	if (mode === 'complete') {
		return `<div class="answer-cell"><span class="question-answer-mark blank"></span></div>
        <div class="answer-cell"><span class="question-answer-mark blank"></span></div>
        <div class="answer-cell"><span class="question-answer-mark blank"></span></div>
        <div class="answer-date-cell"></div>`;
	}

	const answerValue = question.answer.responseValue;
	return `<div class="answer-cell ${answerValue === 'yes' ? 'active-yes' : ''}"><span class="question-answer-mark ${answerValue === 'yes' ? 'yes' : 'blank'}">${answerValue === 'yes' ? 'X' : ''}</span></div>
        <div class="answer-cell ${answerValue === 'no' ? 'active-no' : ''}"><span class="question-answer-mark ${answerValue === 'no' ? 'no' : 'blank'}">${answerValue === 'no' ? 'X' : ''}</span></div>
        <div class="answer-cell ${answerValue === 'na' ? 'active-na' : ''}"><span class="question-answer-mark ${answerValue === 'na' ? 'na' : 'blank'}">${answerValue === 'na' ? 'X' : ''}</span></div>
        <div class="answer-date-cell"><div class="question-answer-date">${question.answer.dueDate ? escapeHtml(question.answer.dueDate) : ''}</div></div>
        ${question.answer.comment ? `<div class="question-comment">${escapeHtml(question.answer.comment)}</div>` : ''}`;
}

function renderFactsSection(facts: FullBookFact[], commonFactBlocks: StandardContentBlock[]) {
	return `<section class="section-block facts-section" id="id-facts">
        <div class="section-heading">
          <p class="eyebrow">Faktadel</p>
          <h2>Fakta</h2>
          <p>Samlad faktadel i tvåspaltsformat enligt den äldre bokens lässätt.</p>
        </div>
        ${commonFactBlocks.map((block) => renderCommonFactBlock(block)).join('')}
        <div class="fact-list">
          ${facts
						.map(
							(fact) => `<article class="fact-entry">
              <div>
                <h4>${escapeHtml(fact.title)}</h4>
                <div class="fact-meta">${escapeHtml(fact.factId)} · ${escapeHtml(fact.nodeId)}</div>
              </div>
              <div class="fact-links">
                ${fact.questionRefs
									.map(
										(ref) => `<span class="fact-link-chip">${escapeHtml(ref.prefix)}</span>`
									)
									.join('')}
              </div>
              <div class="fact-body">${fact.bodyHtml}</div>
            </article>`
						)
						.join('')}
        </div>
      </section>`;
}

function renderCommonFactBlock(block: StandardContentBlock) {
	return `<article class="fact-entry fact-standard-block" id="${escapeHtml(blockSectionAnchorId(block))}">
        <div class="fact-body">${stripDuplicateLeadingHeading(block.bodyHtml, block.title)}</div>
      </article>`;
}

function renderAppendicesSection(blocks: StandardContentBlock[]) {
	return blocks.map((block) => renderStandardContentBlock(block, { forceAppendixRole: true })).join('\n');
}

function renderStandardContentBlock(
	block: StandardContentBlock,
	options: { injectGlossary?: StandardContentBlock | null; forceAppendixRole?: boolean } = {}
) {
	const effectiveType = options.forceAppendixRole ? 'appendix' : block.contentType;
	const heading = standardContentHeading({ ...block, contentType: effectiveType });
	const blockClass = standardContentSectionClass({ ...block, contentType: effectiveType });
	const bodyHtml = stripDuplicateLeadingHeading(block.bodyHtml, block.title);
	if (block.blockId === 'id-preface1' && options.injectGlossary) {
		return renderPrefaceOneBlock(block, heading.kicker, bodyHtml, options.injectGlossary);
	}
	const glossaryHtml =
		options.injectGlossary ?
			renderEmbeddedGlossary(options.injectGlossary)
		:	'';
	return `<section class="section-block ${blockClass}" id="${escapeHtml(blockSectionAnchorId(block))}">
        <div class="section-heading">
          <p class="eyebrow">${escapeHtml(heading.kicker)}</p>
          <h2>${escapeHtml(block.title)}</h2>
        </div>
        <div class="rich-text">${bodyHtml}</div>
        ${glossaryHtml}
      </section>`;
}

function renderEmbeddedGlossary(block: StandardContentBlock) {
	return `<section class="embedded-glossary">
        <div class="embedded-glossary-heading">Liten ordlista</div>
        <div class="embedded-glossary-body">${block.bodyHtml}</div>
      </section>`;
}

function renderPrefaceOneBlock(
	block: StandardContentBlock,
	kicker: string,
	bodyHtml: string,
	glossaryBlock: StandardContentBlock
) {
	const splitMatch = splitPrefaceOneFollowup(bodyHtml);
	if (!splitMatch) {
		return `<section class="section-block preface-section" id="${escapeHtml(blockSectionAnchorId(block))}">
        <div class="section-heading">
          <p class="eyebrow">${escapeHtml(kicker)}</p>
          <h2>${escapeHtml(block.title)}</h2>
        </div>
        <div class="rich-text">${bodyHtml}</div>
        ${renderEmbeddedGlossary(glossaryBlock)}
      </section>`;
	}

	return `<section class="section-block preface-section" id="${escapeHtml(blockSectionAnchorId(block))}">
        <div class="section-heading">
          <p class="eyebrow">${escapeHtml(kicker)}</p>
          <h2>${escapeHtml(block.title)}</h2>
        </div>
        <div class="rich-text">${splitMatch.beforeHtml}</div>
        <div class="preface-followup">
          <div class="preface-followup-body">${splitMatch.afterHtml}</div>
          ${renderEmbeddedGlossary(glossaryBlock)}
        </div>
      </section>`;
}

function splitPrefaceOneFollowup(bodyHtml: string) {
	const marker = /<h2>\s*Åtgärdsplan i Faktabanken\s*<\/h2>/i;
	const match = marker.exec(bodyHtml);
	if (!match || match.index <= 0) {
		return null;
	}

	return {
		beforeHtml: bodyHtml.slice(0, match.index),
		afterHtml: bodyHtml.slice(match.index)
	};
}

function renderTocGroup(title: string, href: string, entries: TocEntry[]) {
	if (entries.length === 0) {
		return '';
	}

	return `<a class="toc-group-heading" href="${escapeHtml(href)}" data-target="${escapeHtml(href)}"><span>${escapeHtml(title)}</span><span class="toc-dots"></span><span class="toc-page-number" data-target="${escapeHtml(href)}"></span></a>
      ${entries.map((entry) => renderTocEntry(entry)).join('')}`;
}

function renderTocEntry(entry: TocEntry) {
	return `<a class="toc-entry ${entry.isSubentry ? 'toc-subentry' : ''}" href="${escapeHtml(entry.href)}" data-target="${escapeHtml(entry.href)}">
        <span>${escapeHtml(entry.label)}</span>
        <span class="toc-dots"></span>
        <span class="toc-page-number" data-target="${escapeHtml(entry.href)}"></span>
      </a>`;
}

function buildTocEntriesFromBlock(block: StandardContentBlock, headingLevels: number[]) {
	const href = `#${blockSectionAnchorId(block)}`;
	const entries: TocEntry[] = [{ label: block.title, href }];
	for (const heading of extractHeadingTexts(block.bodyHtml, headingLevels)) {
		if (heading === block.title || entries.some((entry) => entry.label === heading)) {
			continue;
		}
		entries.push({ label: heading, href, isSubentry: true });
	}
	return entries;
}

function checklistAnchorId(checklist: FullBookChecklist) {
	return `checklist-${checklist.slug}`;
}

function groupAnchorId(group: FullBookGroup) {
	return `group-${group.nodeId}`;
}

function blockSectionAnchorId(block: StandardContentBlock) {
	return block.blockId ?? `block-${slugifyForId(block.contentType)}-${slugifyForId(block.title)}`;
}

function prefaceSectionAnchorId(block?: StandardContentBlock | null) {
	return block ? blockSectionAnchorId(block) : 'id-preface1';
}

function slugifyForId(value: string) {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function extractHeadingTexts(bodyHtml: string, headingLevels: number[]) {
	const levelSet = new Set(headingLevels.map((level) => String(level)));
	const headings: string[] = [];
	for (const match of bodyHtml.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/gis)) {
		if (!levelSet.has(match[1])) {
			continue;
		}
		const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
		if (!text || headings.includes(text)) {
			continue;
		}
		headings.push(text);
	}
	return headings;
}

function standardContentHeading(block: StandardContentBlock) {
	switch (block.contentType) {
		case 'preface':
			return { kicker: 'Förord' };
		case 'appendix':
			return { kicker: 'Bilaga' };
		case 'journal':
			return { kicker: 'Journal' };
		case 'plan':
			return { kicker: 'Plantext' };
		case 'glossary':
			return { kicker: 'Ordlista' };
		default:
			return { kicker: 'Standardinnehåll' };
	}
}

function standardContentSectionClass(block: StandardContentBlock) {
	switch (block.contentType) {
		case 'preface':
			return 'preface-section';
		case 'appendix':
			return 'appendix-section';
		case 'journal':
			return 'journal-section';
		case 'plan':
			return 'plan-section';
		case 'glossary':
			return 'glossary-section';
		default:
			return 'standard-section';
	}
}

function rewriteStaticAssetUrls(html: string) {
	return html.replace(
		/\b(src|href)=["'](\/(?:fact-images|brand|downloads)\/[^"']+)["']/gi,
		(_, attr: string, rawPath: string) => `${attr}="${fileAssetHref(rawPath.slice(1))}"`
	);
}

function fileAssetHref(relativePath: string) {
	return pathToFileURL(path.join(staticRoot, ...relativePath.split('/'))).href;
}

function resolveExistingAssetHref(candidates: string[]) {
	const foundCandidate = candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
	return pathToFileURL(foundCandidate).href;
}

function legacyFoAssetHref(filename: string) {
	return pathToFileURL(path.join(legacyFoAssetRoot, filename)).href;
}

function resolveBrandLogoAssetHref() {
	return resolveExistingAssetHref([
		path.join(localLegacyPdfAssetRoot, 'Logga_MHS_2009_med_text.jpg'),
		path.join(legacyFoAssetRoot, 'Logga_MHS_2009_med_text.jpg'),
		path.join(brandAssetRoot, 'mhs-logo-color.png'),
		path.join(brandAssetRoot, 'mhs-logo.png'),
		path.join(brandAssetRoot, 'mhs-logo-color.jpg')
	]);
}

function resolveIntroIllustrationAssetHref() {
	return resolveExistingAssetHref([
		path.join(localLegacyPdfAssetRoot, 'Illu_Inledning.png'),
		path.join(legacyFoAssetRoot, 'Illu_Inledning.png'),
		path.join(brandAssetRoot, 'hero-01.jpg'),
		path.join(brandAssetRoot, 'hero.jpg')
	]);
}

function resolveLegacyCoverImage(mode: FullBookReport['mode']) {
	return mode === 'complete' ?
			resolveExistingAssetHref([
				path.join(localLegacyPdfAssetRoot, 'MHS-2013-omslag-generell.jpg'),
				path.join(legacyFoAssetRoot, 'MHS-2013-omslag-generell.jpg'),
				path.join(brandAssetRoot, 'hero.jpg'),
				path.join(brandAssetRoot, 'hero-02.jpg')
			])
		:	resolveExistingAssetHref([
				path.join(localLegacyPdfAssetRoot, 'mhs-individ.jpg'),
				path.join(legacyFoAssetRoot, 'mhs-individ.jpg'),
				path.join(brandAssetRoot, 'hero.jpg'),
				path.join(brandAssetRoot, 'hero-03.jpg')
			]);
}

function stripDuplicateLeadingHeading(bodyHtml: string, title: string) {
	const match = bodyHtml.match(/^\s*<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/i);
	if (!match) {
		return bodyHtml;
	}

	const headingText = normalizeComparableText(stripHtmlTags(decodeBasicEntities(match[2])));
	const titleText = normalizeComparableText(title);
	if (!headingText || headingText !== titleText) {
		return bodyHtml;
	}

	return bodyHtml.slice(match[0].length).replace(/^\s+/, '');
}

function questionFlags(question: {
	cc?: boolean;
	ccExtra?: boolean;
	annualQuestion?: boolean;
	newFlag?: boolean;
	recommended?: boolean;
	base?: boolean;
}) {
	const flags: string[] = [];

	if (question.cc) {
		flags.push('Grundvillkor');
	}
	if (question.ccExtra) {
		flags.push('Grundvillkor extra');
	}
	if (question.annualQuestion) {
		flags.push('Årlig fråga');
	}
	if (question.newFlag) {
		flags.push('Ny fråga');
	}
	if (question.recommended) {
		flags.push('Rekommenderad');
	}
	if (question.base) {
		flags.push('Basfråga');
	}

	return flags;
}

function extractGroupPrefix(questions: FullBookQuestion[]) {
	return questions[0]?.prefix.split(/[-.]/)[0] ?? '';
}

function groupBackgroundColor(checklistSlug: string) {
	switch (checklistSlug) {
		case 'miljohusesyn-g':
			return '#d5e3d7';
		case 'miljohusesyn-v':
			return '#dfe8cd';
		case 'miljohusesyn-d':
			return '#ebe1cd';
		case 'miljohusesyn-a':
			return '#d8e0e8';
		default:
			return '#d5e3d7';
	}
}

function normalizeAnswerValue(value?: string | null): FullBookQuestion['answer']['responseValue'] {
	return value === 'yes' || value === 'no' || value === 'na' ? value : 'blank';
}

function buildProfileMap<
	TRow extends { profileKey: string } & Record<TKey, number>,
	TKey extends keyof TRow
>(rows: TRow[], foreignKey: TKey) {
	const profileMap = new Map<number, string[]>();

	for (const row of rows) {
		const bucket = profileMap.get(row[foreignKey] as number) ?? [];
		bucket.push(row.profileKey);
		profileMap.set(row[foreignKey] as number, bucket);
	}

	return profileMap;
}

function stripHtmlTags(value: string) {
	return value.replace(/<[^>]+>/g, ' ');
}

function decodeBasicEntities(value: string) {
	return value
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>');
}

function normalizeComparableText(value: string) {
	return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('sv');
}

function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function runProcess(command: string, args: string[], cwd: string) {
	return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			windowsHide: true
		});

		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk: Buffer | string) => {
			stdout += chunk.toString();
		});

		child.stderr.on('data', (chunk: Buffer | string) => {
			stderr += chunk.toString();
		});

		child.on('error', reject);
		child.on('close', (code) => resolve({ code, stdout, stderr }));
	});
}

async function waitForFile(filePath: string, retries = 10, delayMs = 300) {
	for (let attempt = 0; attempt < retries; attempt += 1) {
		try {
			await fs.access(filePath);
			return;
		} catch (error) {
			if (attempt === retries - 1) {
				throw error;
			}
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}
}
