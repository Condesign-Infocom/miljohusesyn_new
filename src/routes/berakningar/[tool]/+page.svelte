<svelte:head>
	<title>{data.calculator.title}</title>
</svelte:head>

<script lang="ts">
	import type { PublicCalculatorPage } from '$lib/public-site';

	let {
		data
	}: {
		data: {
			calculator: PublicCalculatorPage;
		};
	} = $props();
</script>

<main class="page">
	<section class="calculator-card">
		<p class="eyebrow">{data.calculator.status === 'rebuild' ? 'Återuppbyggnad pågår' : 'Planerad beräkning'}</p>
		<h1>{data.calculator.title}</h1>
		<p class="lead">{data.calculator.excerpt}</p>
		<div class="calculator-body">
			{#each data.calculator.bodyParagraphs as paragraph (paragraph)}
				<p>{paragraph}</p>
			{/each}
		</div>
		<p class="back-link"><a href="/berakningar">Tillbaka till Beräkningar</a></p>
	</section>
</main>

<style>
	.page {
		box-sizing: border-box;
		margin: 0 auto;
		max-width: 1170px;
		padding: 24px 15px 0;
	}

	.calculator-card {
		background: rgba(255, 252, 246, 0.92);
		border: 1px solid #ddd3c2;
		border-radius: 24px;
		box-shadow: 0 20px 50px rgba(56, 55, 42, 0.08);
		max-width: 900px;
		padding: 30px;
	}

	.eyebrow {
		color: #7d5d25;
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		margin: 0 0 12px;
		text-transform: uppercase;
	}

	h1 {
		color: #4d4d4d;
		font-family: Dosis, Roboto, Arial, sans-serif;
		font-size: 42px;
		font-weight: 500;
		line-height: 1.1;
		margin: 0 0 16px;
	}

	.lead,
	.calculator-body p,
	.back-link {
		color: #333;
		font-size: 17px;
		line-height: 1.6;
	}

	.lead {
		font-size: 19px;
		margin: 0 0 22px;
	}

	.calculator-body p {
		margin: 0 0 18px;
	}

	.back-link {
		margin: 22px 0 0;
	}

	.back-link a {
		color: #7f9972;
		text-decoration: none;
	}

	.back-link a:hover {
		text-decoration: underline;
	}
</style>
