import fs from 'node:fs/promises';

export async function resolveChromePath() {
	const envCandidates = [
		process.env.CHROME_PATH,
		process.env.PUPPETEER_EXECUTABLE_PATH,
		process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
	].filter((candidate): candidate is string => Boolean(candidate));

	for (const candidate of envCandidates) {
		try {
			await fs.access(candidate);
			return candidate;
		} catch {
			continue;
		}
	}

	try {
		const { chromium } = await import('@playwright/test');
		const playwrightPath = chromium.executablePath();

		if (playwrightPath) {
			await fs.access(playwrightPath);
			return playwrightPath;
		}
	} catch {
		// Fall through to explicit OS candidates when Playwright is unavailable.
	}

	const pathCandidates = [
		'/usr/bin/chromium-browser',
		'/usr/bin/chromium',
		'/usr/bin/google-chrome',
		'/opt/google/chrome/chrome',
		'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
		'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
		'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
		'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
		'C:\\Program Files\\Chromium\\Application\\chrome.exe'
	];

	for (const candidate of pathCandidates) {
		try {
			await fs.access(candidate);
			return candidate;
		} catch {
			continue;
		}
	}

	return null;
}
