<script lang="ts">
	import { resolve } from '$app/paths';
	import Footer from '../sections/Footer.svelte';

	let {
		downloadHref,
		checklistsHref
	}: {
		downloadHref: string;
		checklistsHref: string;
	} = $props();

	const route = (path: string) => (resolve as unknown as (pathname: string) => string)(path);
</script>

<Footer />

<section class="border-t border-line/70 bg-cream-2/60">
	<div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between md:px-6">
		<p class="text-sm text-mute">
			Miljöhusesyn samlar regler, checklistor och förklarande fakta för företag på landsbygden.
		</p>
		<div class="flex flex-wrap gap-3">
			<a
				href={route(checklistsHref)}
				class="inline-flex items-center rounded-full border border-line bg-cream px-4 py-2.5 text-sm font-semibold text-leaf-2 transition hover:border-leaf"
			>
				Mina checklistor
			</a>
			<a
				href={route(downloadHref)}
				data-sveltekit-reload
				class="inline-flex items-center rounded-full bg-leaf px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-leaf-2"
			>
				Ladda ned Miljöhusesyn
			</a>
		</div>
	</div>
</section>
