<svelte:head>
	<title>Mina Uppgifter</title>
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
		data: { profile: EditableProfileData; saved: boolean };
		form?: FormState;
	} = $props();
</script>

<ProfileWizard profile={data.profile} saved={data.saved} {form} />
