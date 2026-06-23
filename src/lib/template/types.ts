export type TemplateIconName =
	| 'arrow-right'
	| 'arrow-up-right'
	| 'book-open'
	| 'calculator'
	| 'download'
	| 'file-text'
	| 'leaf'
	| 'log-in'
	| 'mail'
	| 'menu'
	| 'search'
	| 'sprout'
	| 'tractor'
	| 'wheat';

export type TemplateLink = {
	href: string;
	label: string;
};

export type TemplateButtonVariant = 'primary' | 'secondary';

export type FeatureGridItem = {
	icon: TemplateIconName;
	label: string;
};

export type FaktabankCard = {
	icon: TemplateIconName;
	title: string;
	body: string;
	href: string;
};

export type CalculationTool = {
	number: string;
	title: string;
	body: string;
	href: string;
};

export type NewsListItem = {
	date: string;
	title: string;
	href: string;
	body?: string;
};

export type ContactCard = {
	icon: TemplateIconName;
	label: string;
};
