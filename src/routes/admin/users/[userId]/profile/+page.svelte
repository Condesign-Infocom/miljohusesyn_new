<svelte:head>
	<title>Admin - Mina Uppgifter</title>
</svelte:head>

<script lang="ts">
	import ProfileWizard from '$lib/components/ProfileWizard.svelte';
	import type { EditableProfileData, EditableProfileInput } from '$lib/types/profile';

	type FormState = {
		errors?: Record<string, string>;
		values?: EditableProfileInput;
	};

	let {
		data,
		form
	}: {
		data: {
			userId: number;
			user: {
				displayName: string;
				username: string;
			};
			profile: EditableProfileData;
			saved: boolean;
		};
		form?: FormState;
	} = $props();
</script>

<ProfileWizard
	profile={data.profile}
	saved={data.saved}
	{form}
	eyebrow="Admin"
	title={`Mina Uppgifter: ${data.user.displayName}`}
	lead="Redigera samma verksamhets- och pliktuppgifter som styr checklistor, profiler och filtrering för den här användaren."
	backRoute="/admin/users/[userId]"
	backRouteParams={{ userId: String(data.userId) }}
	backLabel="Tillbaka till användaren"
	loginLead="Inloggningsuppgifterna visas som referens här. Konto, roll och e-post redigeras på adminkortet för användaren."
	saveLabel="Spara uppgifter"
/>
