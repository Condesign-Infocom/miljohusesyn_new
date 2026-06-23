import { expect, test, type Locator } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { loginAsDemo } from './helpers';

const { Client } = pg;

function readLocalEnv() {
	const envPath = path.resolve(process.cwd(), '.env.local');
	if (!existsSync(envPath)) {
		return {};
	}

	return Object.fromEntries(
		readFileSync(envPath, 'utf8')
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith('#') && line.includes('='))
			.map((line) => {
				const separatorIndex = line.indexOf('=');
				return [
					line.slice(0, separatorIndex).trim(),
					line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
				];
			})
	);
}

function readDomainStoreDsn() {
	const localEnv = readLocalEnv();
	return process.env.MHS_DOMAIN_STORE_POSTGRES_DSN ?? localEnv.MHS_DOMAIN_STORE_POSTGRES_DSN ?? null;
}

async function listFactDraftIds(sourceRowId: string) {
	const dsn = readDomainStoreDsn();
	if (!dsn) {
		return [];
	}

	const client = new Client({ connectionString: dsn });
	await client.connect();
	try {
		const result = await client.query<{ id: string }>(
			"select id from editorial_drafts where content_kind = 'fact' and source_row_id = $1",
			[sourceRowId]
		);
		return Array.from(new Set(result.rows.map((row) => row.id)));
	} finally {
		await client.end();
	}
}

async function deleteFactDrafts(draftIds: string[]) {
	const dsn = readDomainStoreDsn();
	if (!dsn || draftIds.length === 0) {
		return;
	}

	const client = new Client({ connectionString: dsn });
	await client.connect();
	try {
		await client.query('begin');
		await client.query('delete from editorial_review_requests where draft_id = any($1::text[])', [draftIds]);
		await client.query('delete from editorial_draft_revisions where draft_id = any($1::text[])', [draftIds]);
		await client.query('delete from editorial_drafts where id = any($1::text[])', [draftIds]);
		await client.query('commit');
	} catch (error) {
		await client.query('rollback');
		throw error;
	} finally {
		await client.end();
	}
}

async function deleteFactDraftsByPayload(title: string, bodyHtml: string) {
	const dsn = readDomainStoreDsn();
	if (!dsn) {
		return;
	}

	const client = new Client({ connectionString: dsn });
	await client.connect();
	try {
		const result = await client.query<{ id: string }>(
			`
				select distinct d.id
				from editorial_drafts d
				join editorial_draft_revisions r on r.draft_id = d.id
				where d.content_kind = 'fact'
				  and r.payload_json like $1
				  and r.payload_json like $2
			`,
			[`%"title":"${title.replaceAll('"', '\\"')}"%`, `%"bodyHtml":"${bodyHtml.replaceAll('"', '\\"')}"%`]
		);
		await deleteFactDrafts(result.rows.map((row) => row.id));
	} finally {
		await client.end();
	}
}

async function loadFactRowSnapshot(sourceRowId: string) {
	const dsn = readDomainStoreDsn();
	if (!dsn) {
		return null;
	}

	const client = new Client({ connectionString: dsn });
	await client.connect();
	try {
		const fact = await client.query<{
			title: string;
			body_html: string;
		}>('select title, body_html from facts where id = $1', [sourceRowId]);
		const links = await client.query<{
			id: string;
			snapshot_id: string;
			fact_row_id: string;
			node_id: string;
			link_source: string;
			link_status: string;
		}>('select * from fact_links where fact_row_id = $1 order by id', [sourceRowId]);

		return {
			fact: fact.rows[0] ?? null,
			links: links.rows
		};
	} finally {
		await client.end();
	}
}

async function restoreFactRowSnapshot(
	sourceRowId: string,
	snapshot: Awaited<ReturnType<typeof loadFactRowSnapshot>>
) {
	const dsn = readDomainStoreDsn();
	if (!dsn || !snapshot?.fact) {
		return;
	}

	const client = new Client({ connectionString: dsn });
	await client.connect();
	try {
		await client.query('begin');
		await client.query('update facts set title = $1, body_html = $2 where id = $3', [
			snapshot.fact.title,
			snapshot.fact.body_html,
			sourceRowId
		]);
		await client.query('delete from fact_links where fact_row_id = $1', [sourceRowId]);
		for (const link of snapshot.links) {
			await client.query('insert into fact_links values ($1, $2, $3, $4, $5, $6)', [
				link.id,
				link.snapshot_id,
				link.fact_row_id,
				link.node_id,
				link.link_source,
				link.link_status
			]);
		}
		await client.query('commit');
	} catch (error) {
		await client.query('rollback');
		throw error;
	} finally {
		await client.end();
	}
}

async function dragToLowerHalf(source: Locator, target: Locator) {
	const sourceHandle = await source.elementHandle();
	const targetHandle = await target.elementHandle();

	if (!sourceHandle || !targetHandle) {
		throw new Error('Drag source or target is not visible.');
	}

	await source.page().evaluate(
		([sourceElement, targetElement]) => {
			const dataTransfer = new DataTransfer();
			const bounds = targetElement.getBoundingClientRect();
			const clientY = bounds.top + bounds.height * 0.82;

			sourceElement.dispatchEvent(
				new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer })
			);
			targetElement.dispatchEvent(
				new DragEvent('dragover', { bubbles: true, cancelable: true, clientY, dataTransfer })
			);
			targetElement.dispatchEvent(
				new DragEvent('drop', { bubbles: true, cancelable: true, clientY, dataTransfer })
			);
			sourceElement.dispatchEvent(
				new DragEvent('dragend', { bubbles: true, cancelable: true, dataTransfer })
			);
		},
		[sourceHandle, targetHandle]
	);

	await sourceHandle.dispose();
	await targetHandle.dispose();
}

test('admin can save and publish a fact directly in content studio', async ({ page }) => {
	await loginAsDemo(page, 'admin');

	await page.goto('/admin/content-studio/facts');
	const firstFactTitle = (await page.locator('tbody .row-link').first().innerText()).trim();
	const draftTitle = `${firstFactTitle} browser publish`;
	const draftBodyHtml = '<p>Updated from browser test</p>';
	await Promise.all([
		page.waitForURL(/\/admin\/content-studio\/facts\/.+/),
		page.locator('tbody .row-link').first().click()
	]);
	const sourceRowId = decodeURIComponent(page.url().split('/').pop() ?? '');
	const existingDraftIds = await listFactDraftIds(sourceRowId);
	const originalFact = await loadFactRowSnapshot(sourceRowId);

	try {
		await expect(page.locator('.rich-surface .ProseMirror')).toHaveCSS('color', 'rgb(47, 55, 50)');
		await page.getByLabel('Titel').fill(draftTitle);
		await page.locator('.rich-surface .ProseMirror').fill('Updated from browser test');
		await page.locator('.picker-list input[type="checkbox"]').nth(0).check();
		await page.locator('.picker-list input[type="checkbox"]').nth(1).check();
		await page.getByRole('button', { name: 'Spara och publicera' }).click();

		await expect(page.getByText('Faktan sparades och publicerades direkt.')).toBeVisible();
		await expect(page.getByText('Publicerad', { exact: true })).toBeVisible();
		await expect(page.getByText('valid', { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Publicera', exact: true })).toHaveCount(0);
	} finally {
		await restoreFactRowSnapshot(sourceRowId, originalFact);
		const draftIdsAfterTest = await listFactDraftIds(sourceRowId);
		await deleteFactDrafts(draftIdsAfterTest.filter((draftId) => !existingDraftIds.includes(draftId)));
		await deleteFactDraftsByPayload(draftTitle, draftBodyHtml);
	}
});

test('admin can add a checklist question from the tree row create menu', async ({ page }) => {
	await loginAsDemo(page, 'admin');

	await page.goto('/admin/content-studio/checklists');
	const questionCount = Number(await page.locator('.overview-card strong').nth(1).innerText());
	await page.locator('.toggle-button').first().click();
	await page.locator('.question-list .question-button').nth(1).click();
	await page.getByRole('button', { name: /Skapa nära frågan/i }).nth(0).click();
	await page.getByRole('button', { name: 'Ny fråga efter' }).click();

	await expect(page.getByText('Frågan skapades.')).toBeVisible({ timeout: 30000 });
	await expect(page.locator('.overview-card strong').nth(1)).toHaveText(String(questionCount + 1));
	await expect(page.locator('.question-list').first()).toContainText('Ny fråga');
	await expect(page.getByLabel('Frågetext')).toHaveValue('Ny fråga');
});

test('admin can reorder checklist groups with drag and drop', async ({ page }) => {
	await loginAsDemo(page, 'admin');

	await page.goto('/admin/content-studio/checklists');
	const firstGroup = page.locator('[data-testid^="group-row-"]').nth(0);
	const secondGroup = page.locator('[data-testid^="group-row-"]').nth(1);
	const firstTitle = ((await firstGroup.locator('.group-button span').first().textContent()) ?? '').trim();
	const secondTitle = ((await secondGroup.locator('.group-button span').first().textContent()) ?? '').trim();

	const reorderSaved = page.waitForResponse(
		(response) => response.url().includes('?/reorderGroups') && response.request().method() === 'POST'
	);
	await dragToLowerHalf(firstGroup.getByRole('button', { name: /Dra för att flytta gruppen/ }), secondGroup);

	await expect(page.locator('[data-testid^="group-row-"]').nth(0).locator('.group-button span').first()).toHaveText(secondTitle);
	await expect(page.locator('[data-testid^="group-row-"]').nth(1).locator('.group-button span').first()).toHaveText(firstTitle);
	await reorderSaved;
	await page.reload();
	await expect(page.locator('[data-testid^="group-row-"]').nth(0).locator('.group-button span').first()).toHaveText(secondTitle);
	await expect(page.locator('[data-testid^="group-row-"]').nth(1).locator('.group-button span').first()).toHaveText(firstTitle);
});

test('admin can reorder checklist questions with drag and drop', async ({ page }) => {
	await loginAsDemo(page, 'admin');

	await page.goto('/admin/content-studio/checklists');
	await page.locator('[data-testid^="group-row-"]').first().getByRole('button', { name: /Skapa nära/ }).click();
	await page.getByRole('button', { name: 'Ny fråga i grupp' }).click();
	await expect(page.getByText('Frågan skapades.')).toBeVisible();
	const firstQuestion = page.locator('[data-testid^="question-row-0-"]').nth(0);
	const secondQuestion = page.locator('[data-testid^="question-row-0-"]').nth(1);
	const firstText = ((await firstQuestion.locator('.question-button span').first().textContent()) ?? '').trim();
	const secondText = ((await secondQuestion.locator('.question-button span').first().textContent()) ?? '').trim();

	const reorderSaved = page.waitForResponse(
		(response) => response.url().includes('?/reorderQuestions') && response.request().method() === 'POST'
	);
	await dragToLowerHalf(firstQuestion.getByRole('button', { name: /Dra för att flytta frågan/ }), secondQuestion);

	await expect(page.locator('[data-testid^="question-row-0-"]').nth(0).locator('.question-button span').first()).toHaveText(secondText);
	await expect(page.locator('[data-testid^="question-row-0-"]').nth(1).locator('.question-button span').first()).toHaveText(firstText);
	await reorderSaved;
	await page.reload();
	await expect(page.locator('[data-testid^="question-row-0-"]').nth(0).locator('.question-button span').first()).toHaveText(secondText);
	await expect(page.locator('[data-testid^="question-row-0-"]').nth(1).locator('.question-button span').first()).toHaveText(firstText);
});

test('admin can edit a checklist question and keep the selection', async ({ page }) => {
	await loginAsDemo(page, 'admin');

	await page.goto('/admin/content-studio/checklists');
	await page.locator('.toggle-button').first().click();
	await page.locator('.question-list .question-button').nth(0).click();
	await expect(page.getByRole('button', { name: /Nollställ fråga/ })).toBeVisible();
	await expect(page.getByRole('button', { name: /Arkivera fråga/ })).toBeVisible();
	await page.getByLabel('Frågetext').fill('Updated from browser test');
	await page.getByRole('checkbox', { name: 'Rekommenderad' }).uncheck();
	await page.getByRole('button', { name: 'Spara fråga' }).click();

	await expect(page.getByText('Frågan sparades.')).toBeVisible({ timeout: 30000 });
	await expect(page.getByLabel('Frågetext')).toHaveValue('Updated from browser test');
	await expect(page.locator('.question-list').first()).toContainText('Updated from browser test');
	await expect(page.getByRole('checkbox', { name: 'Rekommenderad' })).not.toBeChecked();
});

test('admin can open the fact linking modal from checklist workspace', async ({ page }) => {
	await loginAsDemo(page, 'admin');

	await page.goto('/admin/content-studio/checklists');
	await page.locator('.toggle-button').first().click();
	await page.locator('.question-list .question-button').first().click();
	await page.getByRole('button', { name: 'Lägg till / länka fakta' }).click();

	const linkDialog = page.getByRole('dialog', { name: 'Länka befintlig fakta' });
	await expect(linkDialog).toBeVisible();
	await expect(linkDialog.getByPlaceholder('Sök på titel, fact-id eller utdrag')).toBeVisible();
	await expect(linkDialog.getByRole('button', { name: 'Skapa ny fakta' })).toBeVisible();
	await linkDialog.getByRole('button', { name: 'Skapa ny fakta' }).click();
	const createDialog = page.getByRole('dialog', { name: 'Skapa ny fakta' });
	await expect(createDialog).toBeVisible();
	await expect(createDialog.getByLabel('Titel')).toBeVisible();
	await expect(createDialog.getByLabel('Brödtext', { exact: true })).toBeAttached();
	await expect(page.getByText('Ny fakta skapades.')).toHaveCount(0);
	await createDialog.getByRole('button', { name: 'Tillbaka' }).click();
	await expect(linkDialog).toBeVisible();
	await linkDialog.getByPlaceholder('Sök på titel, fact-id eller utdrag').fill('ar');
	await expect(linkDialog.getByRole('button', { name: 'Koppla' }).first()).toBeVisible();
	await linkDialog.getByRole('button', { name: 'Koppla' }).first().click();
	await expect(page.getByText('Fakta kopplades.')).toBeVisible();

	await expect(page.getByRole('heading', { name: 'Redigera fakta här' })).toHaveCount(0);
	const firstEditLink = page.getByRole('link', { name: 'Redigera fakta' }).first();
	await expect(firstEditLink).toHaveAttribute('href', /editFact=1/);
	await firstEditLink.click();
	const editDialog = page.getByRole('dialog', { name: 'Redigera fakta' });
	await expect(editDialog).toBeVisible();
	await expect(editDialog.getByLabel('Titel')).toBeVisible();
});
