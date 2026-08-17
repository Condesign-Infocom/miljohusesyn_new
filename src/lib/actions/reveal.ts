/**
 * Svelte action that fades + rises an element into view the first time it
 * crosses into the viewport. Pairs with the `.reveal` / `.is-visible`
 * utility classes defined in `app.css`. Respects `prefers-reduced-motion`
 * automatically, since the base styles are scoped inside a
 * `(prefers-reduced-motion: no-preference)` media query.
 */

export interface RevealOptions {
	/** Delay before the transition starts, in ms. Useful for staggering lists. */
	delay?: number;
	/** How far (px) the element travels while revealing. */
	distance?: number;
}

export function reveal(node: HTMLElement, options: RevealOptions = {}) {
	const apply = (opts: RevealOptions) => {
		node.style.setProperty('--reveal-delay', `${opts.delay ?? 0}ms`);
		node.style.setProperty('--reveal-distance', `${opts.distance ?? 18}px`);
	};

	node.classList.add('reveal');
	apply(options);

	if (typeof IntersectionObserver === 'undefined') {
		node.classList.add('is-visible');
		return {};
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					node.classList.add('is-visible');
					observer.unobserve(node);
				}
			}
		},
		{ threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
	);
	observer.observe(node);

	return {
		update(newOptions: RevealOptions) {
			apply(newOptions);
		},
		destroy() {
			observer.disconnect();
		}
	};
}
