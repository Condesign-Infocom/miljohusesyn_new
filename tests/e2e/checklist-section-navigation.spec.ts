import { expect, test } from '@playwright/test';
import { loginAsDemo } from './helpers';

test('section detail lets the user move to the next area without returning to overview', async ({
	page
}) => {
	await loginAsDemo(page);
	await page.goto('/checklists/miljohusesyn-a/sections/node-id-A1-2015-02-25');

	const nextArea = page.getByRole('link', { name: /Nästa område/i });
	const previousArea = page.getByRole('link', { name: /Föregående område/i });

	await expect(nextArea).toBeVisible();
	await expect(previousArea).toHaveCount(0);

	await nextArea.click();
	await expect(page).toHaveURL(/\/checklists\/miljohusesyn-a\/sections\/node-id-A2-2015-02-25$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anmälan av tillbud och olycksfall');
	await expect(previousArea).toBeVisible();

	await nextArea.click();
	await expect(page).toHaveURL(/\/checklists\/miljohusesyn-a\/sections\/node-id-A3-2015-02-25$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Arbetsmiljön vid byggnadsarbete');
	await expect(previousArea).toBeVisible();

	await previousArea.click();
	await expect(page).toHaveURL(/\/checklists\/miljohusesyn-a\/sections\/node-id-A2-2015-02-25$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Anmälan av tillbud och olycksfall');
});
