import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
	loadChecklistEditor,
	loadContentStudioFacts
} from './content-studio';
import {
	normalizePublicBodyHtml
} from './public-content-format';
import { resolveChromePath } from './chrome-path';

type QaFact = {
	factRowId: string;
	factId: string | null;
	title: string;
	nodeId: string | null;
	bodyHtml: string;
	linkStatus: string;
	linkSource: string;
};

type QaQuestion = {
	id: string;
	nodeId: string;
	groupTitle: string;
	questionText: string;
	flags: string[];
	facts: QaFact[];
};

type QaGroup = {
	id: string;
	nodeId: string;
	title: string;
	introText: string;
	questions: QaQuestion[];
};

type QaReport = {
	title: string;
	checklistId: string;
	snapshotId: string | null;
	groups: QaGroup[];
	questionCount: number;
	questionWithFactsCount: number;
	factReferenceCount: number;
};

type PdfSuccess = {
	ok: true;
	outputPdf: string;
	htmlPath: string;
	reportPath: string;
};

type PdfFailure = {
	ok: false;
	message: string;
	stdout: string;
	stderr: string;
};

type PdfRenderResult = PdfSuccess | PdfFailure;

const workspaceRoot = path.resolve(process.cwd(), '..', '..');
const qaOutputRoot = path.join(
	workspaceRoot,
	'new-system',
	'publishing',
	'outputs',
	'qa-reports'
);
const pagedJsUrl = 'https://unpkg.com/pagedjs/dist/paged.polyfill.js';

export async function buildChecklistQaReport(checklistId: string) {
	const editor = await loadChecklistEditor(checklistId);
	if (!editor.tree) {
		return null;
	}

	const factResult = await loadContentStudioFacts({
		snapshotId: editor.latestSnapshot?.id
	});
	const factRowsById = new Map(
		factResult.items.flatMap((item) => [
			[item.sourceRowId, item],
			[item.id, item]
		])
	);

	const groups = editor.tree.groups.map((group) => {
		const questions = group.questions.map((question) => {
			const factMap = new Map<string, QaFact>();

			for (const link of question.factLinks) {
				const factRow = factRowsById.get(link.factRowId);
				const logicalKey = factRow?.factId?.trim() || link.factId?.trim() || link.factRowId;
				if (!logicalKey) {
					continue;
				}

				const bodyHtml = normalizePublicBodyHtml(factRow?.bodyHtml ?? '');
				const current = factMap.get(logicalKey);
				if (current && current.bodyHtml.length >= bodyHtml.length) {
					continue;
				}

				factMap.set(logicalKey, {
					factRowId: link.factRowId,
					factId: factRow?.factId ?? link.factId,
					title: factRow?.title ?? link.title,
					nodeId: factRow?.nodeId ?? link.nodeId,
					bodyHtml,
					linkStatus: link.linkStatus,
					linkSource: link.linkSource
				});
			}

			return {
				id: question.id,
				nodeId: question.nodeId,
				groupTitle: group.title,
				questionText: question.questionText,
				flags: questionFlags(question.flags),
				facts: Array.from(factMap.values()).sort((left, right) =>
					(left.factId ?? left.title).localeCompare(right.factId ?? right.title, 'sv')
				)
			} satisfies QaQuestion;
		});

		return {
			id: group.id,
			nodeId: group.nodeId,
			title: group.title,
			introText: group.introText,
			questions
		} satisfies QaGroup;
	});

	const questionCount = groups.reduce((count, group) => count + group.questions.length, 0);
	const questionWithFactsCount = groups.reduce(
		(count, group) => count + group.questions.filter((question) => question.facts.length > 0).length,
		0
	);
	const factReferenceCount = groups.reduce(
		(count, group) => count + group.questions.reduce((inner, question) => inner + question.facts.length, 0),
		0
	);

	const report = {
		title: editor.tree.checklist.title,
		checklistId: editor.tree.checklist.checklistId,
		snapshotId: editor.latestSnapshot?.id ?? null,
		groups,
		questionCount,
		questionWithFactsCount,
		factReferenceCount
	} satisfies QaReport;

	return {
		report,
		html: renderChecklistQaReportHtml(report)
	};
}

export async function renderChecklistQaReportPdf(
	checklistId: string
): Promise<PdfRenderResult> {
	const built = await buildChecklistQaReport(checklistId);
	if (!built) {
		return {
			ok: false,
			message: 'Checklist QA report source data was not found.',
			stdout: '',
			stderr: ''
		};
	}

	const chromePath = await resolveChromePath();
	if (!chromePath) {
		return {
			ok: false,
			message: 'Could not locate a Chrome-compatible browser for paged.js PDF rendering.',
			stdout: '',
			stderr: ''
		};
	}

	const exportId = `${sanitizeFileSegment(built.report.checklistId)}-${Date.now()}-${randomUUID().slice(0, 8)}`;
	const outputDir = path.join(qaOutputRoot, exportId);
	const htmlPath = path.join(outputDir, 'checklist-qa-report.html');
	const outputPdf = path.join(outputDir, 'checklist-qa-report.pdf');
	const reportPath = path.join(outputDir, 'checklist-qa-render-report.json');

	await fs.mkdir(outputDir, { recursive: true });
	await fs.writeFile(htmlPath, built.html, 'utf8');

	const args = [
		'--headless=new',
		'--no-sandbox',
		'--disable-setuid-sandbox',
		'--disable-dev-shm-usage',
		'--disable-gpu',
		'--allow-file-access-from-files',
		'--enable-local-file-accesses',
		'--run-all-compositor-stages-before-draw',
		'--virtual-time-budget=20000',
		'--print-to-pdf-no-header',
		`--print-to-pdf=${outputPdf}`,
		pathToFileURL(htmlPath).href
	];

	const render = await runProcess(chromePath, args, outputDir);
	const reportPayload = {
		checklistId: built.report.checklistId,
		title: built.report.title,
		chromePath,
		htmlPath,
		outputPdf,
		questionCount: built.report.questionCount,
		questionWithFactsCount: built.report.questionWithFactsCount,
		factReferenceCount: built.report.factReferenceCount,
		returnCode: render.code,
		stdout: render.stdout,
		stderr: render.stderr,
		status: render.code === 0 ? 'rendered' : 'failed'
	};
	await fs.writeFile(reportPath, JSON.stringify(reportPayload, null, 2), 'utf8');

	if (render.code !== 0) {
		return {
			ok: false,
			message: `Chrome exited with code ${render.code ?? 'unknown'}.`,
			stdout: render.stdout,
			stderr: render.stderr
		};
	}

	try {
		await fs.access(outputPdf);
	} catch {
		return {
			ok: false,
			message: 'Chrome did not produce the expected PDF output file.',
			stdout: render.stdout,
			stderr: render.stderr
		};
	}

	return {
		ok: true,
		outputPdf,
		htmlPath,
		reportPath
	};
}

export function renderChecklistQaReportHtml(report: QaReport) {
	return `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(report.title)} - QA-faktagranskning</title>
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
        margin: 12mm 10mm 12mm 10mm;
      }

      :root {
        color-scheme: light;
        --ink: #16322c;
        --muted: #5c6d67;
        --line: #cfd8d3;
        --paper: #f6f8f5;
        --accent: #0a7d58;
        --warning: #9c3d10;
        --warning-bg: #fff1e8;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: var(--ink);
        background: white;
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        font-size: 10.5px;
        line-height: 1.4;
      }

      main {
        display: grid;
        gap: 10mm;
      }

      .cover {
        display: grid;
        gap: 4mm;
        padding: 4mm 0 2mm;
        border-bottom: 2px solid var(--accent);
      }

      .cover h1 {
        margin: 0;
        font-size: 24px;
        line-height: 1.15;
      }

      .eyebrow {
        margin: 0;
        color: var(--accent);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .summary {
        display: flex;
        flex-wrap: wrap;
        gap: 3mm;
      }

      .summary-item {
        min-width: 40mm;
        padding: 2.5mm 3mm;
        border: 1px solid var(--line);
        border-radius: 3mm;
        background: var(--paper);
      }

      .summary-item strong {
        display: block;
        font-size: 14px;
      }

      .group {
        display: grid;
        gap: 4mm;
        break-inside: avoid;
      }

      .group-header {
        display: grid;
        gap: 1.5mm;
        padding-top: 2mm;
        border-top: 1px solid var(--line);
      }

      .group-header h2 {
        margin: 0;
        font-size: 16px;
      }

      .group-meta {
        color: var(--muted);
        font-size: 10px;
      }

      .group-intro {
        margin: 0;
        color: var(--muted);
      }

      .row {
        display: grid;
        grid-template-columns: minmax(0, 40%) minmax(0, 60%);
        gap: 2.2mm;
        align-items: start;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .question,
      .facts {
        min-height: 100%;
        border: 1px solid var(--line);
        border-radius: 3mm;
        background: white;
        padding: 2.4mm 2.6mm;
      }

      .question {
        background: linear-gradient(180deg, #f8fbfa 0%, #ffffff 100%);
      }

      .question-meta,
      .facts-meta {
        display: flex;
        justify-content: space-between;
        gap: 2mm;
        align-items: baseline;
      }

      .node-id,
      .facts-count {
        color: var(--muted);
        font-size: 9px;
      }

      .question-text {
        margin: 1.2mm 0 0;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.3;
      }

      .flag-list {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5mm;
        margin-top: 2mm;
      }

      .flag {
        padding: 0.8mm 1.8mm;
        border-radius: 999px;
        background: #e8f4ef;
        color: var(--accent);
        font-size: 10px;
        font-weight: 600;
      }

      .facts {
        display: grid;
        gap: 1.8mm;
      }

      .facts.missing {
        border-color: #edc2ab;
        background: var(--warning-bg);
      }

      .fact-card {
        display: grid;
        gap: 1.5mm;
        padding-top: 1.6mm;
        border-top: 1px solid #dfe6e2;
      }

      .fact-card:first-of-type {
        border-top: 0;
        padding-top: 0;
      }

      .fact-title {
        margin: 0;
        font-size: 10.5px;
        font-weight: 700;
      }

      .fact-meta {
        color: var(--muted);
        font-size: 9.5px;
      }

      .fact-body :is(p, ul, ol) {
        margin: 0 0 1.4mm;
      }

      .fact-body :is(h1, h2, h3, h4) {
        margin: 0.8mm 0 1.4mm;
        font-size: 11px;
      }

      .fact-body table {
        width: 100%;
        border-collapse: collapse;
        font-size: 9.5px;
      }

      .fact-body th,
      .fact-body td {
        border: 1px solid var(--line);
        padding: 1mm 1.4mm;
        vertical-align: top;
      }

      .missing-copy {
        color: var(--warning);
        font-weight: 600;
        margin: 0;
      }

      .footer-note {
        color: var(--muted);
        font-size: 10px;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="cover">
        <p class="eyebrow">QA-rapport / fråga mot fakta</p>
        <h1>${escapeHtml(report.title)}</h1>
        <div class="summary">
          <div class="summary-item">
            <span>Frågor</span>
            <strong>${report.questionCount}</strong>
          </div>
          <div class="summary-item">
            <span>Frågor med fakta</span>
            <strong>${report.questionWithFactsCount}</strong>
          </div>
          <div class="summary-item">
            <span>Faktareferenser</span>
            <strong>${report.factReferenceCount}</strong>
          </div>
          <div class="summary-item">
            <span>Checklista</span>
            <strong>${escapeHtml(report.checklistId)}</strong>
          </div>
        </div>
        <p class="footer-note">Rapporten visar varje fråga i vänster kolumn och kopplade faktatexter i höger kolumn för snabb felgranskning.</p>
      </section>
      ${report.groups.map((group) => renderGroupHtml(group)).join('\n')}
    </main>
  </body>
</html>`;
}

function questionFlags(flags: {
	cc: boolean;
	ccExtra: boolean;
	base: boolean;
	newFlag: boolean;
	recommended: boolean;
}) {
	return [
		flags.cc ? 'Tvärvillkor' : null,
		flags.ccExtra ? 'Extra tvärvillkor' : null,
		flags.base ? 'Grundkrav' : null,
		flags.newFlag ? 'Ny' : null,
		flags.recommended ? 'Rekommendation' : null
	].filter((flag): flag is string => Boolean(flag));
}

function renderGroupHtml(group: QaGroup) {
	return `<section class="group">
  <header class="group-header">
    <h2>${escapeHtml(group.title)}</h2>
    <div class="group-meta">${escapeHtml(group.nodeId)}</div>
    ${group.introText ? `<p class="group-intro">${escapeHtml(group.introText)}</p>` : ''}
  </header>
  ${group.questions.map((question) => renderQuestionHtml(question)).join('\n')}
</section>`;
}

function renderQuestionHtml(question: QaQuestion) {
	const factsMarkup =
		question.facts.length > 0 ?
			question.facts.map((fact) => renderFactHtml(fact)).join('\n')
		:	`<div class="fact-card"><p class="missing-copy">Ingen kopplad faktatext hittades för den här frågan.</p></div>`;

	return `<article class="row">
  <section class="question">
    <div class="question-meta">
      <span class="node-id">${escapeHtml(question.nodeId)}</span>
    </div>
    <p class="question-text">${escapeHtml(question.questionText)}</p>
    ${question.flags.length > 0 ? `<div class="flag-list">${question.flags.map((flag) => `<span class="flag">${escapeHtml(flag)}</span>`).join('')}</div>` : ''}
  </section>
  <section class="facts ${question.facts.length === 0 ? 'missing' : ''}">
    <div class="facts-meta">
      <span class="facts-count">${question.facts.length > 0 ? `${question.facts.length} faktatext${question.facts.length === 1 ? '' : 'er'}` : 'Faktatext saknas'}</span>
    </div>
    ${factsMarkup}
  </section>
</article>`;
}

function renderFactHtml(fact: QaFact) {
	const identifiers = [fact.factId, fact.nodeId].filter(Boolean).join(' · ');
	const metadata = [
		identifiers,
		fact.linkStatus && fact.linkStatus !== 'linked' ? `status: ${fact.linkStatus}` : null,
		fact.linkSource && fact.linkSource !== 'explicit' ? `källa: ${fact.linkSource}` : null
	]
		.filter(Boolean)
		.join(' · ');

	return `<article class="fact-card">
  <div>
    <p class="fact-title">${escapeHtml(fact.title)}</p>
    ${metadata ? `<div class="fact-meta">${escapeHtml(metadata)}</div>` : ''}
  </div>
  <div class="fact-body">${fact.bodyHtml || '<p class="missing-copy">Faktaposten finns, men saknar innehåll.</p>'}</div>
</article>`;
}

function escapeHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function sanitizeFileSegment(value: string) {
	return value.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function runProcess(command: string, args: string[], cwd: string) {
	return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
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

		child.on('error', (error) => {
			resolve({
				code: -1,
				stdout,
				stderr: `${stderr}\n${error.message}`.trim()
			});
		});

		child.on('close', (code) => {
			resolve({ code, stdout, stderr });
		});
	});
}
