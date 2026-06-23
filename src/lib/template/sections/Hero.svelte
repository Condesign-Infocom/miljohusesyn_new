<script lang="ts">
  import { resolve } from '$app/paths';
  import Icon from '../primitives/Icon.svelte';
  import Badge from '../primitives/Badge.svelte';
  import Button from '../primitives/Button.svelte';
  import Card from '../primitives/Card.svelte';
  import type { TemplateLink } from '../types';

  let {
    eyebrow = 'Ett verktyg från LRF',
    title = 'Välkommen till',
    highlight = 'Miljöhusesyn',
    subtitle = 'Snabbt och enkelt – ta reda på vilka regler och författningar som gäller just ditt jordbruksföretag. Samlat, sökbart och uppdaterat inför 2026.',
    primaryCta = { label: 'Logga in / Registrera dig', href: '#' },
    secondaryCta = { label: 'Ladda ned Miljöhusesyn', href: '#faktabank' },
    image = '/images/field-wheat.jpg',
    onboardingHref = '/faktabank/material'
  }: {
    eyebrow?: string;
    title?: string;
    highlight?: string;
    subtitle?: string;
    primaryCta?: TemplateLink;
    secondaryCta?: TemplateLink;
    image?: string;
    onboardingHref?: string;
  } = $props();

  const resolvedOnboardingHref = $derived(
    onboardingHref.startsWith('/') ?
      (resolve as unknown as (pathname: string) => string)(onboardingHref)
    : onboardingHref
  );
</script>

<section class="relative overflow-hidden">
  <div
    class="absolute inset-0 -z-10 bg-cover bg-center"
    style={`background-image:url(${image})`}
    aria-hidden="true"
  ></div>
  <div
    class="absolute inset-0 -z-10 bg-gradient-to-br from-cream via-cream/85 to-cream/30"
    aria-hidden="true"
  ></div>
  <div class="absolute inset-0 -z-10 grain opacity-60" aria-hidden="true"></div>
  <div
    class="mx-auto grid max-w-7xl gap-12 px-6 pt-16 pb-24 md:pt-24 md:pb-28 lg:grid-cols-12 lg:gap-16"
  >
    <div class="lg:col-span-7">
      <Badge label={eyebrow}>
        {#snippet icon()}
          <Icon name="leaf" class="h-3.5 w-3.5" />
        {/snippet}
      </Badge>
      <h1
        class="font-display mt-6 text-5xl leading-[1.05] font-semibold tracking-tight text-bark md:text-6xl lg:text-7xl"
      >
        {title} <span class="text-leaf">{highlight}</span>.
      </h1>
      <p class="mt-6 max-w-2xl text-lg text-ink/75 md:text-xl">{subtitle}</p>
      <div class="mt-9 flex flex-wrap items-center gap-3">
        <Button label={primaryCta.label} href={primaryCta.href} variant="primary">
          {#snippet icon()}
            <Icon name="arrow-right" class="h-4 w-4" />
          {/snippet}
        </Button>
        <Button label={secondaryCta.label} href={secondaryCta.href} variant="secondary">
          {#snippet icon()}
            <Icon name="download" class="h-4 w-4" />
          {/snippet}
        </Button>
      </div>
    </div>
    <div class="relative lg:col-span-5">
      <div class="absolute -top-6 -right-6 h-40 w-40 rounded-full bg-sage/30 blur-2xl"></div>
      <Card class="relative backdrop-blur">
        <div class="flex items-center justify-between text-xs text-mute">
          <span class="inline-flex items-center gap-1.5">
            <span class="h-1.5 w-1.5 rounded-full bg-leaf"></span>Uppdaterad inför 2026
          </span>
          <span>Version 26.1</span>
        </div>
        <h3 class="font-display mt-3 text-2xl font-semibold text-bark">Vad omfattar Miljöhusesyn?</h3>
        <ul class="mt-5 space-y-3 text-sm">
          <li class="flex items-start gap-3">
            <span
              class="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-2 text-leaf-2"
            >
              <Icon name="leaf" class="h-3 w-3" />
            </span>
            <span class="text-ink/85">Grundvillkor och tvärvillkor</span>
          </li>
          <li class="flex items-start gap-3">
            <span
              class="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-2 text-leaf-2"
            >
              <Icon name="leaf" class="h-3 w-3" />
            </span>
            <span class="text-ink/85">Djurhållning och djurskydd</span>
          </li>
          <li class="flex items-start gap-3">
            <span
              class="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-2 text-leaf-2"
            >
              <Icon name="leaf" class="h-3 w-3" />
            </span>
            <span class="text-ink/85">Växtodling och gödselhantering</span>
          </li>
          <li class="flex items-start gap-3">
            <span
              class="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-2 text-leaf-2"
            >
              <Icon name="leaf" class="h-3 w-3" />
            </span>
            <span class="text-ink/85">Energi, köldmedia och farligt avfall</span>
          </li>
          <li class="flex items-start gap-3">
            <span
              class="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sage-2 text-leaf-2"
            >
              <Icon name="leaf" class="h-3 w-3" />
            </span>
            <span class="text-ink/85">Arbetsmiljö och tillsyn</span>
          </li>
        </ul>
        <div class="mt-6 flex items-center gap-3 rounded-2xl bg-cream-2 p-4">
          <div class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-leaf text-cream">
            <Icon name="file-text" class="h-5 w-5" />
          </div>
          <div class="text-sm">
            <div class="font-medium text-bark">Instruktion för nya användare</div>
            <a href={resolvedOnboardingHref} class="inline-flex items-center gap-1 text-leaf hover:text-leaf-2">
              Så här kommer du igång<Icon name="arrow-up-right" class="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </Card>
    </div>
  </div>
</section>
