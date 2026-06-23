<script>
  import Icon from '../primitives/Icon.svelte';
  let {
    eyebrow = 'Beräkningar',
    heading = 'Snabba beräkningar för stallgödsel och spridning.',
    body = 'Praktiska räknare som hjälper dig att kontrollera krav på areal, lagringsvolym och fosforbalans.',
    tools = [
      { number: '01', title: 'Spridningsareal', body: 'Beräkningar utifrån djur', href: '#' },
      { number: '02', title: 'Fosforbalans', body: 'Spridningsareal utifrån fosforbalansberäkningar', href: '#' },
      { number: '03', title: 'Lagringsvolymer', body: 'För stallgödsel beroende på djurslag', href: '#' }
    ]
  } = $props();
</script>

<section id="berakningar" class="mx-auto max-w-7xl px-6 py-24">
  <div
    class="grid gap-10 rounded-3xl border border-line bg-gradient-to-br from-leaf via-leaf-2 to-bark p-10 text-cream md:grid-cols-12 md:p-14"
  >
    <div class="md:col-span-5">
      <span
        class="inline-flex items-center gap-2 rounded-full bg-cream/15 px-3 py-1 text-xs font-medium tracking-widest uppercase"
      >
        <Icon name="calculator" class="lucide lucide-calculator h-3.5 w-3.5" />{eyebrow}
      </span>
      <h2 class="font-display mt-5 text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
        {heading}
      </h2>
      <p class="mt-5 max-w-md text-cream/80">{body}</p>
    </div>
    <div class="grid gap-4 md:col-span-7 md:grid-cols-3">
      {#each tools as tool}
        <a
          href={tool.href}
          class="group flex flex-col justify-between rounded-2xl border border-cream/15 bg-cream/5 p-6 transition hover:bg-cream/10"
        >
          <span class="font-display text-sm text-cream/60">{tool.number}</span>
          <div class="mt-10">
            <h3 class="font-display text-xl font-semibold">{tool.title}</h3>
            <p class="mt-2 text-sm text-cream/70">{tool.body}</p>
          </div>
          <Icon
            name="arrow-up-right"
            class="lucide lucide-arrow-up-right mt-6 h-5 w-5 text-cream/70 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-cream"
          />
        </a>
      {/each}
    </div>
  </div>
</section>
