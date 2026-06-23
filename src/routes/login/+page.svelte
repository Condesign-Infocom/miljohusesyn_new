<svelte:head>
	<title>Logga in</title>
</svelte:head>

<script lang="ts">
	let {
		data,
		form
	}: {
		data: { redirectTo: string };
		form:
			| {
					login?: string;
					incorrect?: boolean;
			  }
			| undefined;
	} = $props();
</script>

<main class="login-page">
	<section class="login-panel">
		<h1>Logga in</h1>
		<h2>Fyll i användarnamn och lösenord</h2>

		{#if form?.incorrect}
			<div class="alert" role="alert">Felaktigt användarnamn eller lösenord.</div>
		{/if}

		<form method="POST" action={`/login?redirectTo=${encodeURIComponent(data.redirectTo)}`}>
			<label for="login">Användarnamn / E-post</label>
			<input
				id="login"
				name="login"
				type="text"
				required
				autocomplete="username"
				placeholder="Ange ditt användarnamn"
				value={form?.login ?? 'demo'}
			/>

			<label for="password">Lösenord</label>
			<input
				id="password"
				name="password"
				type="password"
				required
				autocomplete="current-password"
				placeholder="Ange ditt lösenord"
				value="demo123"
			/>

			<div class="demo-users" aria-label="Demo users">
				<span>demo</span>
				<span>animals</span>
				<span>mixed</span>
				<span>admin</span>
			</div>

			<button type="submit">Logga in</button>
		</form>
	</section>
</main>

<style>
	.login-page {
		align-items: flex-start;
		background: #eeeeee;
		color: #1f2933;
		display: flex;
		font-family: Arial, Helvetica, sans-serif;
		justify-content: center;
		min-height: 100vh;
		padding: 64px 20px;
	}

	.login-panel {
		max-width: 400px;
		text-align: left;
		width: 100%;
	}

	h1 {
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 2.4rem;
		font-weight: 400;
		margin: 0 0 8px;
		text-align: center;
	}

	h2 {
		font-size: 1.1rem;
		font-weight: 300;
		margin: 0 0 34px;
		text-align: center;
	}

	form {
		display: grid;
		gap: 10px;
	}

	label {
		font-size: 0.9rem;
		font-weight: 300;
		margin-left: 5px;
	}

	input {
		border: 1px solid #c8d0ca;
		border-radius: 5px;
		box-sizing: border-box;
		font: inherit;
		height: 38px;
		padding: 8px 10px;
		width: 100%;
	}

	button {
		align-self: start;
		background: #007a5b;
		border: 0;
		border-radius: 5px;
		color: #ffffff;
		cursor: pointer;
		font: inherit;
		margin-top: 12px;
		padding: 10px 24px;
		width: 132px;
	}

	button:hover {
		background: #015440;
	}

	.alert {
		background: #f2dede;
		border: 1px solid #ebccd1;
		color: #a94442;
		margin-bottom: 24px;
		padding: 12px;
	}

	.demo-users {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 8px 0 2px;
	}

	.demo-users span {
		border: 1px solid #d6ddd8;
		border-radius: 4px;
		color: #55625a;
		font-size: 0.82rem;
		padding: 4px 7px;
	}

	@media screen and (max-width: 393px) {
		button {
			width: 100%;
		}
	}
</style>
