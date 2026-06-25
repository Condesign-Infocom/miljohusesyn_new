import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pagedJsBundlePath = path.join(path.dirname(require.resolve('pagedjs')), '../dist/paged.polyfill.js');

let cachedPagedJsBundle: string | null = null;

export async function writePagedJsBundle(outputDir: string) {
	cachedPagedJsBundle ??= await fs.readFile(pagedJsBundlePath, 'utf8');

	const targetPath = path.join(outputDir, 'paged.polyfill.js');
	await fs.writeFile(targetPath, cachedPagedJsBundle, 'utf8');
	return 'paged.polyfill.js';
}
