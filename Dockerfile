FROM node:20-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV CHROME_PATH=/usr/bin/chromium

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends chromium \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml ./

RUN corepack enable \
	&& pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

EXPOSE 10000

CMD ["sh", "-c", "pnpm db:migrate:runtime-postgres && node build"]
