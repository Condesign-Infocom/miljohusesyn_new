<script>
  import Icon from '../primitives/Icon.svelte';
  let {
    eyebrow = 'Faktabank',
    title = 'Hitta rätt regler – ämne för ämne.',
    seeAll = { label: 'Se hela faktabanken', href: '#' },
    cards = [
      {
        icon: 'leaf',
        title: 'Grundvillkor',
        body: 'De villkor som ditt företag måste uppfylla för att få fullt jordbruksstöd.',
        href: '#'
      },
      {
        icon: 'tractor',
        title: 'Djurhållning',
        body: 'Djurskydd, utrymmeskrav, hygien och hantering av animaliska biprodukter.',
        href: '#'
      },
      {
        icon: 'sprout',
        title: 'Växtodling',
        body: 'Gödsling, sprutning, lagringskapacitet för stallgödsel och avloppsslam.',
        href: '#'
      },
      {
        icon: 'book-open',
        title: 'Branschriktlinjer',
        body: 'Vägledningar och praxis framtagna tillsammans med berörda branscher.',
        href: '#'
      },
      {
        icon: 'file-text',
        title: 'Regler och tillsyn',
        body: 'Tips inför tillsyn, tillsynsmyndigheter och miljösanktionsavgifter.',
        href: '#'
      },
      {
        icon: 'download',
        title: 'Material för nedladdning',
        body: 'Blanketter, journaler och PDF-versioner att ladda ned och skriva ut.',
        href: '#'
      }
    ]
  } = $props();
</script>

<section id="faktabank" class="bg-cream-2/40 py-24">
  <div class="mx-auto max-w-7xl px-6">
    <div class="flex flex-wrap items-end justify-between gap-6">
      <div>
        <span class="text-xs font-medium tracking-widest text-leaf uppercase">{eyebrow}</span>
        <h2
          class="font-display mt-3 text-4xl leading-tight font-semibold tracking-tight text-bark md:text-5xl"
        >
          {title}
        </h2>
      </div>
      <a
        href={seeAll.href}
        class="inline-flex items-center gap-2 text-sm font-medium text-leaf hover:text-leaf-2"
      >
        {seeAll.label}<Icon name="arrow-right" class="h-4 w-4" />
      </a>
    </div>
    <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {#each cards as card, i}
        <a
          href={card.href}
          class="group relative flex flex-col rounded-3xl border border-line bg-cream p-7 transition hover:-translate-y-0.5 hover:border-leaf/40 hover:shadow-lg hover:shadow-leaf/10"
        >
          <div class="flex items-start justify-between">
            <span
              class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-2 text-leaf-2 transition group-hover:bg-leaf group-hover:text-cream"
            >
              <Icon name={card.icon} class="h-6 w-6" />
            </span>
            <span class="font-display text-sm text-mute">{String(i + 1).padStart(2, '0')}</span>
          </div>
          <h3 class="font-display mt-6 text-2xl font-semibold text-bark">{card.title}</h3>
          <p class="mt-2 text-sm text-ink/70">{card.body}</p>
          <span class="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-leaf">
            Läs mer<Icon
              name="arrow-up-right"
              class="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        </a>
      {/each}
    </div>
  </div>
</section>
