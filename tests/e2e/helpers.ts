import type { Page } from '@playwright/test';

export async function loginAsDemo(page: Page, username = 'demo') {
	await page.context().clearCookies();
	await page.goto('/login');
	await page.getByLabel('Användarnamn / E-post').fill(username);
	await page.getByLabel('Lösenord').fill('demo123');
	await page.getByRole('button', { name: 'Logga in' }).click();
}
