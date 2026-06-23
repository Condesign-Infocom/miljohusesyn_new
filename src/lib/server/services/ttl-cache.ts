export function createTtlCache<T>(ttlMs: number) {
	let cached: { value: T; expiresAt: number } | null = null;
	let inFlight: Promise<T> | null = null;

	return {
		async get(loader: () => Promise<T>, now = Date.now()) {
			if (cached && cached.expiresAt > now) {
				return cached.value;
			}

			inFlight ??= loader()
				.then((value) => {
					cached = {
						value,
						expiresAt: Date.now() + ttlMs
					};
					inFlight = null;
					return value;
				})
				.catch((error) => {
					inFlight = null;
					throw error;
				});

			return inFlight;
		},
		clear() {
			cached = null;
			inFlight = null;
		}
	};
}
