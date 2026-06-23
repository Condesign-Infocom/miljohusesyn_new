<script>
  import Icon from '../primitives/Icon.svelte';
</script>

<footer class="border-t border-line bg-bark text-cream/85">
  <div class="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-12">
    <div class="md:col-span-4">
      <div class="flex items-center gap-2">
        <span class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-leaf text-cream">
          <Icon name="wheat" class="h-5 w-5" />
        </span>
        <span class="font-display text-xl font-semibold tracking-tight text-cream">Miljöhusesyn</span>
      </div>
      <p class="mt-5 max-w-sm text-sm text-cream/70">Framtagen av LRF i samarbete med berörda myndigheter. Förvaltas av Sigill Kvalitetssystem AB.</p>
    </div>
    <div class="md:col-span-3 lg:col-span-2 lg:[grid-column-start:auto]">
      <h4 class="text-sm font-semibold tracking-wide text-cream uppercase">Innehåll</h4>
      <ul class="mt-4 space-y-2.5 text-sm">
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Viktigt för alla</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Grundvillkor</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Faktabank</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Regeländringar</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Material för nedladdning</a></li>
      </ul>
    </div>
    <div class="md:col-span-3 lg:col-span-2 lg:[grid-column-start:auto]">
      <h4 class="text-sm font-semibold tracking-wide text-cream uppercase">Verktyg</h4>
      <ul class="mt-4 space-y-2.5 text-sm">
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Logga in</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Registrera dig</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Beräkningar</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Ordlista</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Branschriktlinjer</a></li>
      </ul>
    </div>
    <div class="md:col-span-3 lg:col-span-2 lg:[grid-column-start:auto]">
      <h4 class="text-sm font-semibold tracking-wide text-cream uppercase">Kontakt</h4>
      <ul class="mt-4 space-y-2.5 text-sm">
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Om Miljöhusesyn</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Kontakt</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Cookies</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Tillgänglighet</a></li>
        <li><a href="#" class="text-cream/70 transition hover:text-cream">Personuppgifter</a></li>
      </ul>
    </div>
  </div>
  <div class="border-t border-cream/10">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-cream/60">
      <span>© 2026 Sigill Kvalitetssystem AB</span>
      <span>Medfinansieras av Europeiska unionen</span>
    </div>
  </div>
</footer>
