import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import type { AppDb } from '$lib/server/db/client';
import { createRuntimeGateway } from '$lib/server/db/runtime-gateway';
import { getChecklistOverview, getChecklistSectionDetail } from './checklists';
import { resolveChromePath } from './chrome-path';

type ActionPlanQuestion = {
	id: number;
	nodeId: string;
	prefix: string;
	questionText: string;
	status: 'no' | 'blank';
	comment: string;
	dueDate: string;
};

type ActionPlanGroup = {
	nodeId: string;
	prefix: string;
	title: string;
	introText: string;
	questions: ActionPlanQuestion[];
};

type ActionPlanSection = {
	nodeId: string;
	prefix: string;
	title: string;
	groups: ActionPlanGroup[];
};

type ActionPlanReport = {
	slug: string;
	title: string;
	userDisplayName: string;
	companyName: string;
	sections: ActionPlanSection[];
	noCount: number;
	unansweredCount: number;
	totalCount: number;
};

const workspaceRoot = path.resolve(process.cwd(), '..', '..');
const exportOutputRoot = path.join(
	workspaceRoot,
	'new-system',
	'publishing',
	'outputs',
	'app-exports'
);
const pagedJsUrl = 'https://unpkg.com/pagedjs/dist/paged.polyfill.js';
const compositeChecklistSlugs = new Set(['miljohusesyn', 'grundvillkor', 'nya-fragor']);

export async function generateChecklistActionPlanPdf(db: AppDb, checklistSlug: string, userId: number) {
	const runtimeGateway = createRuntimeGateway(db);
	const [overview, user] = await Promise.all([
		getChecklistOverview(db, checklistSlug, userId),
		runtimeGateway.findUserById(userId)
	]);

	if (!overview || !user) {
		return null;
	}

	const sectionTargets =
		compositeChecklistSlugs.has(overview.slug) ?
			dedupeCompositeOverviewSections(overview.sections)
		:	overview.sections;
	const sectionDetails = await Promise.all(
		sectionTargets.map((section) => getChecklistSectionDetail(db, overview.slug, section.nodeId, userId))
	);
	const sections = sectionDetails
		.filter((detail): detail is NonNullable<typeof detail> => detail !== null)
		.map((detail) => ({
			nodeId: detail.section.nodeId,
			prefix: detail.section.prefix,
			title: detail.section.title,
			groups: detail.groups
				.map((group) => ({
					nodeId: group.nodeId,
					prefix: group.prefix,
					title: group.title,
					introText: group.introText,
					questions: group.questions
						.filter(
							(question) =>
								question.answer.responseValue === 'no' || question.answer.responseValue === 'blank'
						)
						.map((question) => ({
							id: question.id,
							nodeId: question.nodeId,
							prefix: question.prefix,
							questionText: question.questionText,
							status: (question.answer.responseValue === 'no' ? 'no' : 'blank') as 'no' | 'blank',
							comment: question.answer.comment,
							dueDate: question.answer.dueDate
						}))
				}))
				.filter((group) => group.questions.length > 0)
		}))
		.filter((section) => section.groups.length > 0);

	const noCount = sections.reduce(
		(total, section) =>
			total +
			section.groups.reduce(
				(groupTotal, group) =>
					groupTotal + group.questions.filter((question) => question.status === 'no').length,
				0
			),
		0
	);
	const unansweredCount = sections.reduce(
		(total, section) =>
			total +
			section.groups.reduce(
				(groupTotal, group) =>
					groupTotal + group.questions.filter((question) => question.status === 'blank').length,
				0
			),
		0
	);
	const totalCount = noCount + unansweredCount;

	const report: ActionPlanReport = {
		slug: overview.slug,
		title: overview.title,
		userDisplayName: user.displayName,
		companyName: user.companyName || user.displayName,
		sections,
		noCount,
		unansweredCount,
		totalCount
	};

	const exportId = `${sanitizeFileSegment(report.slug)}-${Date.now()}-${randomUUID().slice(0, 8)}`;
	const outputDir = path.join(exportOutputRoot, exportId);
	const htmlPath = path.join(outputDir, 'mhs-plan-app.html');
	const outputPdf = path.join(outputDir, 'mhs-plan-app.generated.pdf');
	const reportPath = path.join(outputDir, 'pdf-render-report.json');

	await fs.mkdir(outputDir, { recursive: true });
	await fs.writeFile(htmlPath, renderChecklistActionPlanHtml(report), 'utf8');

	const chromePath = await resolveChromePath();
	if (!chromePath) {
		throw new Error('Could not locate a Chrome-compatible browser for the action-plan PDF renderer.');
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
		slug: report.slug,
		title: report.title,
		userDisplayName: report.userDisplayName,
		output_pdf: outputPdf,
		render_report: reportPath,
		renderer: 'Headless Chrome + paged.js',
		htmlPath,
		returnCode: render.code,
		stdout: render.stdout,
		stderr: render.stderr,
		counts: {
			no: report.noCount,
			unanswered: report.unansweredCount,
			total: report.totalCount
		},
		status: render.code === 0 ? 'rendered' : 'failed'
	};
	await fs.writeFile(reportPath, JSON.stringify(reportPayload, null, 2), 'utf8');

	if (render.code !== 0) {
		throw new Error(`Action-plan PDF renderer exited with code ${render.code ?? 'unknown'}.`);
	}

	await fs.access(outputPdf);

	return {
		filename: `${sanitizeFileSegment(report.slug)}-plan.pdf`,
		contentType: 'application/pdf' as const,
		pdfPath: outputPdf,
		reportPath
	};
}

function renderChecklistActionPlanHtml(report: ActionPlanReport) {
	return `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(report.title)} - Min åtgärdsplan</title>
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
        margin: 14mm 12mm 14mm 12mm;
      }

      :root {
        --ink: #1d322d;
        --muted: #5f6d68;
        --line: #d6ddd9;
        --accent: #007a5b;
        --paper: #f4f7f5;
        --soft: #eef5f2;
        --warning: #8f5b17;
        --warning-bg: #fff6df;
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
        line-height: 1.38;
      }

      main {
        display: grid;
        gap: 6mm;
      }

      .cover {
        display: grid;
        gap: 3mm;
        padding-bottom: 4mm;
        border-bottom: 2px solid var(--accent);
      }

      .eyebrow {
        margin: 0;
        color: var(--accent);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: 24px;
        line-height: 1.1;
      }

      .context {
        color: var(--muted);
      }

      .summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 3mm;
      }

      .summary-item {
        padding: 2.6mm 3mm;
        border: 1px solid var(--line);
        border-radius: 3mm;
        background: var(--paper);
      }

      .summary-item strong {
        display: block;
        margin-top: 1mm;
        font-size: 15px;
      }

      .empty-state {
        padding: 5mm;
        border: 1px solid var(--line);
        border-radius: 3mm;
        background: var(--soft);
        font-size: 12px;
      }

      .section {
        display: grid;
        gap: 3mm;
        break-inside: avoid;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        gap: 4mm;
        align-items: baseline;
        padding-top: 2mm;
        border-top: 1px solid var(--line);
      }

      .section-header h2,
      .group-header h3,
      .question-title {
        margin: 0;
      }

      .section-header h2 {
        font-size: 15px;
      }

      .section-meta,
      .group-prefix,
      .question-prefix,
      .meta-label {
        color: var(--muted);
        font-size: 9px;
      }

      .group {
        display: grid;
        gap: 2.5mm;
      }

      .group-header {
        display: grid;
        gap: 1mm;
      }

      .group-header h3 {
        font-size: 12px;
      }

      .group-intro {
        margin: 0;
        color: var(--muted);
      }

      .question-list {
        display: grid;
        gap: 2mm;
      }

      .question-card {
        display: grid;
        gap: 1.5mm;
        padding: 2.5mm 2.8mm;
        border: 1px solid var(--line);
        border-radius: 2.5mm;
        background: white;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .question-card.unanswered {
        background: var(--warning-bg);
      }

      .question-head {
        display: flex;
        justify-content: space-between;
        gap: 3mm;
        align-items: baseline;
      }

      .status {
        padding: 0.8mm 1.8mm;
        border-radius: 999px;
        font-size: 9px;
        font-weight: 700;
        white-space: nowrap;
      }

      .status.no {
        color: white;
        background: var(--accent);
      }

      .status.blank {
        color: #6d4b15;
        background: #f3dca8;
      }

      .question-title {
        font-size: 11.5px;
        line-height: 1.32;
      }

      .question-meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 2mm;
      }

      .meta-box {
        min-height: 12mm;
        padding: 1.8mm 2mm;
        border: 1px solid #e4e9e6;
        border-radius: 2mm;
        background: #fbfcfb;
      }

      .meta-box p {
        margin: 0;
      }

      .meta-value.empty {
        color: var(--muted);
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="cover">
        <p class="eyebrow">Min åtgärdsplan</p>
        <h1>${escapeHtml(report.title)}</h1>
        <div class="context">${escapeHtml(report.companyName)} · ${escapeHtml(report.userDisplayName)}</div>
        <div class="summary">
          <div class="summary-item">
            <span>Frågor besvarade med nej</span>
            <strong>${report.noCount}</strong>
          </div>
          <div class="summary-item">
            <span>Obesvarade frågor</span>
            <strong>${report.unansweredCount}</strong>
          </div>
          <div class="summary-item">
            <span>Totalt i åtgärdsplanen</span>
            <strong>${report.totalCount}</strong>
          </div>
        </div>
      </section>
      ${
				report.sections.length > 0 ?
					report.sections.map((section) => renderSectionHtml(section)).join('\n')
				:	'<section class="empty-state">Inga frågor är markerade för åtgärdsplanen just nu.</section>'
			}
    </main>
  </body>
</html>`;
}

function renderSectionHtml(section: ActionPlanSection) {
	const questionCount = section.groups.reduce((total, group) => total + group.questions.length, 0);
	return `<section class="section">
  <header class="section-header">
    <h2>${escapeHtml(section.title)}</h2>
    <span class="section-meta">${questionCount} frågor</span>
  </header>
  ${section.groups.map((group) => renderGroupHtml(group)).join('\n')}
</section>`;
}

function renderGroupHtml(group: ActionPlanGroup) {
	return `<article class="group">
  <header class="group-header">
    <span class="group-prefix">${escapeHtml(group.prefix)}</span>
    <h3>${escapeHtml(group.title)}</h3>
    ${group.introText ? `<p class="group-intro">${escapeHtml(group.introText)}</p>` : ''}
  </header>
  <div class="question-list">
    ${group.questions.map((question) => renderQuestionHtml(question)).join('\n')}
  </div>
</article>`;
}

function renderQuestionHtml(question: ActionPlanQuestion) {
	return `<article class="question-card ${question.status === 'blank' ? 'unanswered' : ''}">
  <div class="question-head">
    <div>
      <div class="question-prefix">${escapeHtml(question.prefix)} · ${escapeHtml(question.nodeId)}</div>
      <p class="question-title">${escapeHtml(question.questionText)}</p>
    </div>
    <span class="status ${question.status}">${question.status === 'no' ? 'Svar: Nej' : 'Obesvarad'}</span>
  </div>
  <div class="question-meta-grid">
    <div class="meta-box">
      <p class="meta-label">Kommentar</p>
      <p class="meta-value ${question.comment ? '' : 'empty'}">${question.comment ? escapeHtml(question.comment) : 'Ingen kommentar'}</p>
    </div>
    <div class="meta-box">
      <p class="meta-label">Åtgärdsdatum</p>
      <p class="meta-value ${question.dueDate ? '' : 'empty'}">${question.dueDate ? escapeHtml(formatDueDate(question.dueDate)) : 'Ej satt'}</p>
    </div>
  </div>
</article>`;
}

function dedupeCompositeOverviewSections(
	sections: Array<{
		nodeId: string;
		prefix: string;
		title: string;
		completedQuestions: number;
		totalQuestions: number;
	}>
) {
	const seen = new Set<string>();
	return sections.filter((section) => {
		const key = section.prefix.trim().charAt(0).toUpperCase();
		if (!key || seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
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

function formatDueDate(value: string) {
	const [year, month, day] = value.split('-', 3);
	if (!year || !month || !day) {
		return value;
	}

	return `${day}.${month}.${year}`;
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
