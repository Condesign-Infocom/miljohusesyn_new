import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireContentStudioUser } from '$lib/server/auth';
import {
	addChecklistGroupProfileRule,
	addChecklistQuestionProfileRule,
	loadContentStudioProfileRules,
	removeChecklistGroupProfileRule,
	removeChecklistQuestionProfileRule
} from '$lib/server/services/content-studio';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireContentStudioUser(locals, url);

	const search = url.searchParams.get('q')?.trim() ?? '';
	const checklistId = url.searchParams.get('checklist')?.trim() ?? '';
	const rules = await loadContentStudioProfileRules();

	return {
		...rules,
		search,
		checklistId,
		successMessage: url.searchParams.get('success')
	};
};

export const actions: Actions = {
	addGroupProfile: async ({ locals, request, url }) => {
		requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const groupId = readRequiredFormValue(formData, 'groupId');
		const profileKey = readRequiredFormValue(formData, 'profileKey');

		if (!groupId || !profileKey) {
			return fail(400, { errors: { form: 'Grupp och profil måste anges.' } });
		}

		try {
			await addChecklistGroupProfileRule({ groupId, profileKey });
		} catch (err) {
			return profileRuleFailure(err);
		}

		redirect(303, buildProfileRulesUrl(url, 'Grupprofilen sparades.'));
	},
	removeGroupProfile: async ({ locals, request, url }) => {
		requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const groupId = readRequiredFormValue(formData, 'groupId');
		const profileKey = readRequiredFormValue(formData, 'profileKey');

		if (!groupId || !profileKey) {
			return fail(400, { errors: { form: 'Grupp och profil måste anges.' } });
		}

		try {
			await removeChecklistGroupProfileRule({ groupId, profileKey });
		} catch (err) {
			return profileRuleFailure(err);
		}

		redirect(303, buildProfileRulesUrl(url, 'Grupprofilen togs bort.'));
	},
	addQuestionProfile: async ({ locals, request, url }) => {
		requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const questionId = readRequiredFormValue(formData, 'questionId');
		const profileKey = readRequiredFormValue(formData, 'profileKey');

		if (!questionId || !profileKey) {
			return fail(400, { errors: { form: 'Fråga och profil måste anges.' } });
		}

		try {
			await addChecklistQuestionProfileRule({ questionId, profileKey });
		} catch (err) {
			return profileRuleFailure(err);
		}

		redirect(303, buildProfileRulesUrl(url, 'Frågeprofilen sparades.'));
	},
	removeQuestionProfile: async ({ locals, request, url }) => {
		requireContentStudioUser(locals, url);
		const formData = await request.formData();
		const questionId = readRequiredFormValue(formData, 'questionId');
		const profileKey = readRequiredFormValue(formData, 'profileKey');

		if (!questionId || !profileKey) {
			return fail(400, { errors: { form: 'Fråga och profil måste anges.' } });
		}

		try {
			await removeChecklistQuestionProfileRule({ questionId, profileKey });
		} catch (err) {
			return profileRuleFailure(err);
		}

		redirect(303, buildProfileRulesUrl(url, 'Frågeprofilen togs bort.'));
	}
};

function readRequiredFormValue(formData: FormData, name: string) {
	return String(formData.get(name) ?? '').trim();
}

function profileRuleFailure(err: unknown) {
	const message = err instanceof Error ? err.message : 'Profilregeln kunde inte sparas.';
	return fail(400, { errors: { form: message } });
}

function buildProfileRulesUrl(url: URL, successMessage: string) {
	const params = new URLSearchParams();

	for (const key of ['q', 'checklist']) {
		const value = url.searchParams.get(key)?.trim();
		if (value) {
			params.set(key, value);
		}
	}

	params.set('success', successMessage);
	return `/admin/content-studio/profile-rules?${params.toString()}`;
}
