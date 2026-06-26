import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppDb } from '$lib/server/db/client';
import { createDb } from '$lib/server/db/client';
import { generateChecklistCompleteBookHtmlPdf } from './checklist-complete-book-pdf';

export type PublicCompleteBookArtifact = {
	filename: string;
	contentType: 'application/pdf';
	pdfPath: string;
	reportPath: string;
	generatedAt: string | null;
};

type PublicCompleteBookArtifactRefreshResult =
	| {
			ok: true;
			artifact: PublicCompleteBookArtifact;
	  }
	| {
			ok: false;
			error: Error;
	  };

const workspaceRoot = path.resolve(process.cwd(), '..', '..');
const publicArtifactRoot = path.join(
	workspaceRoot,
	'new-system',
	'publishing',
	'outputs',
	'app-exports',
	'public-complete-book'
);
const publicPdfFilename = 'miljohusesyn-grundbok.pdf';
const publicPdfPath = path.join(publicArtifactRoot, publicPdfFilename);
const publicReportPath = path.join(publicArtifactRoot, 'miljohusesyn-grundbok.report.json');
const publicManifestPath = path.join(publicArtifactRoot, 'miljohusesyn-grundbok.manifest.json');

export async function loadCurrentPublicCompleteBookArtifact(): Promise<PublicCompleteBookArtifact | null> {
	try {
		await fs.access(publicPdfPath);
	} catch {
		return null;
	}

	return {
		filename: publicPdfFilename,
		contentType: 'application/pdf',
		pdfPath: publicPdfPath,
		reportPath: publicReportPath,
		generatedAt: await readGeneratedAtFromManifest()
	};
}

export async function ensurePublicCompleteBookArtifact(
	db: AppDb = createDb()
): Promise<PublicCompleteBookArtifact> {
	const currentArtifact = await loadCurrentPublicCompleteBookArtifact();
	if (currentArtifact) {
		return currentArtifact;
	}

	return await rebuildPublicCompleteBookArtifact(db);
}

export async function rebuildPublicCompleteBookArtifact(
	db: AppDb = createDb()
): Promise<PublicCompleteBookArtifact> {
	const generatedArtifact = await generateChecklistCompleteBookHtmlPdf(db, 'miljohusesyn', 0, 'complete');
	if (!generatedArtifact) {
		throw new Error('Could not generate the public complete-book PDF artifact.');
	}

	await fs.mkdir(publicArtifactRoot, { recursive: true });

	const generatedAt = new Date().toISOString();
	const token = randomUUID().slice(0, 8);
	const nextPdfPath = path.join(publicArtifactRoot, `miljohusesyn-grundbok.${token}.next.pdf`);
	const nextReportPath = path.join(
		publicArtifactRoot,
		`miljohusesyn-grundbok.${token}.next.report.json`
	);
	const nextManifestPath = path.join(
		publicArtifactRoot,
		`miljohusesyn-grundbok.${token}.next.manifest.json`
	);

	try {
		await fs.copyFile(generatedArtifact.pdfPath, nextPdfPath);
		await fs.copyFile(generatedArtifact.reportPath, nextReportPath);
		await fs.writeFile(
			nextManifestPath,
			JSON.stringify(
				{
					filename: publicPdfFilename,
					contentType: 'application/pdf',
					generatedAt
				},
				null,
				2
			),
			'utf8'
		);

		await replaceFile(nextPdfPath, publicPdfPath);
		await replaceFile(nextReportPath, publicReportPath);
		await replaceFile(nextManifestPath, publicManifestPath);
	} finally {
		await cleanupTempFile(nextPdfPath);
		await cleanupTempFile(nextReportPath);
		await cleanupTempFile(nextManifestPath);
	}

	return {
		filename: publicPdfFilename,
		contentType: 'application/pdf',
		pdfPath: publicPdfPath,
		reportPath: publicReportPath,
		generatedAt
	};
}

export async function refreshPublicCompleteBookArtifact(
	db: AppDb = createDb()
): Promise<PublicCompleteBookArtifactRefreshResult> {
	try {
		return {
			ok: true,
			artifact: await rebuildPublicCompleteBookArtifact(db)
		};
	} catch (error) {
		return {
			ok: false,
			error:
				error instanceof Error ? error : new Error('Unknown error while refreshing public complete-book artifact.')
		};
	}
}

async function readGeneratedAtFromManifest() {
	try {
		const raw = await fs.readFile(publicManifestPath, 'utf8');
		const parsed = JSON.parse(raw) as { generatedAt?: string };
		return parsed.generatedAt ?? null;
	} catch {
		return null;
	}
}

async function replaceFile(sourcePath: string, targetPath: string) {
	await fs.copyFile(sourcePath, targetPath);
}

async function cleanupTempFile(filePath: string) {
	try {
		await fs.unlink(filePath);
	} catch {
		// Ignore missing temp files.
	}
}
