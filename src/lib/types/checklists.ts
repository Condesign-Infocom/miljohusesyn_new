export type ChecklistListItem = {
	slug: string;
	title: string;
	completedQuestions: number;
	totalQuestions: number;
};

export type ChecklistList = {
	items: ChecklistListItem[];
};

export type ChecklistFilterOption = {
	slug: string;
	label: string;
	sectionId: string | null;
	active: boolean;
};

export type ChecklistOverview = {
	slug: string;
	title: string;
	filters: ChecklistFilterOption[];
	sections: ChecklistOverviewSection[];
	canExportComplete?: boolean;
	showExportActions?: boolean;
};

export type ChecklistOverviewSection = {
	nodeId: string;
	prefix: string;
	title: string;
	completedQuestions: number;
	totalQuestions: number;
};

export type ChecklistSectionDetail = {
	checklistSlug: string;
	checklistTitle: string;
	filters: ChecklistFilterOption[];
	sections: ChecklistOverviewSection[];
	section: {
		nodeId: string;
		prefix: string;
		title: string;
		description: string;
	};
	previousSection: ChecklistOverviewSection | null;
	nextSection: ChecklistOverviewSection | null;
	groups: ChecklistSectionGroup[];
};

export type ChecklistSectionGroup = {
	nodeId: string;
	prefix: string;
	title: string;
	introText: string;
	questions: ChecklistSectionQuestion[];
};

export type ChecklistSectionQuestion = {
	id: number;
	nodeId: string;
	prefix: string;
	questionText: string;
	annualQuestion: boolean;
	newFlag: boolean;
	factNodeId: string | null;
	answer: {
		responseValue: 'yes' | 'no' | 'na' | 'blank';
		comment: string;
		dueDate: string;
	};
};

export type AnswerPayload = {
	userId: number;
	questionId: number;
	responseValue: 'yes' | 'no' | 'na' | 'blank';
	comment: string;
	dueDate: string | null;
};
