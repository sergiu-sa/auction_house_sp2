/**
 * Render the footer component
 */
export function renderFooter(): void {
  const footer = document.getElementById("footer");
  if (!footer) return;

  const currentYear = new Date().getFullYear();

  footer.innerHTML = `
    <footer class="bg-slate-900 px-6 md:px-8 pb-12 pt-20 text-slate-400">
  <div class="mx-auto max-w-7xl">
    <!-- Main Footer Navigation -->
    <div class="mb-16 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
      <!-- Brand -->
      <div>
        <div class="mb-6 text-3xl font-bold text-white">Aucto</div>
        <p class="mb-6 text-sm leading-relaxed text-slate-400">
          Professional auction infrastructure for serious collectors.
        </p>
        <div class="flex items-center gap-3">
          <div class="h-2 w-2 bg-green-500"></div>
          <span class="text-xs text-slate-400">24/7 Support Active</span>
        </div>
      </div>

      <!-- Platform -->
      <div>
        <h4
          class="mb-6 text-xs font-bold tracking-widest text-slate-400 uppercase"
        >
          Platform
        </h4>
        <ul class="space-y-3 text-sm">
          <li>
            <a
              href="#"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-list text-xs text-slate-500"></i>Browse
              Catalog
            </a>
          </li>
          <li>
            <a
              href="#"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-tower-broadcast text-xs text-slate-500"></i
              >Live Auctions
            </a>
          </li>
          <li>
            <a
              href="#"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-plus text-xs text-slate-500"></i>Sell an
              Item
            </a>
          </li>
          <li>
            <a
              href="#"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-user text-xs text-slate-500"></i>My Account
            </a>
          </li>
        </ul>
      </div>

      <!-- Resources -->
      <div>
        <h4
          class="mb-6 text-xs font-bold tracking-widest text-slate-400 uppercase"
        >
          Resources
        </h4>
        <ul class="space-y-3 text-sm">
          <li>
            <a
              href="#"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-circle-question text-xs text-slate-500"></i
              >How Bidding Works
            </a>
          </li>
          <li>
            <a
              href="#"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-book text-xs text-slate-500"></i>Seller's
              Guide
            </a>
          </li>
          <li>
            <a
              href="#"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-shield text-xs text-slate-500"></i
              >Authentication
            </a>
          </li>
          <li>
            <a
              href="#"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-headset text-xs text-slate-500"></i>Help
              Center
            </a>
          </li>
        </ul>
      </div>

      <!-- Legal + Contact -->
      <div>
        <h4
          class="mb-6 text-xs font-bold tracking-widest text-slate-400 uppercase"
        >
          Legal
        </h4>
        <ul class="space-y-3 text-sm mb-6">
          <li>
            <a
              href="#"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-file-contract text-xs text-slate-500"></i
              >Terms of Service
            </a>
          </li>
          <li>
            <a
              href="#"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-lock text-xs text-slate-500"></i>Privacy
              Policy
            </a>
          </li>
          <li>
            <a
              href="#"
              class="transition-colors hover:text-white inline-flex items-center gap-2"
            >
              <i class="fa-solid fa-cookie text-xs text-slate-500"></i>Cookie
              Policy
            </a>
          </li>
        </ul>

        <div class="mb-4">
          <div
            class="mb-2 text-xs font-bold tracking-widest text-slate-400 uppercase"
          >
            Contact
          </div>
          <a
            href="mailto:support@aucto.app"
            class="block text-white transition-colors hover:text-slate-300"
          >
            support@aucto.app
          </a>
          <a
            href="tel:+4712345678"
            class="block text-white transition-colors hover:text-slate-300"
          >
            +47 123 45 678
          </a>
          <div class="text-slate-400">Available 24/7</div>
        </div>

        <div
          class="mb-4 text-xs font-bold tracking-widest text-slate-400 uppercase"
        >
          Follow
        </div>
        <div class="flex gap-3">
          <a
            href="#"
            class="flex h-10 w-10 items-center justify-center bg-slate-800 text-white transition-colors hover:bg-slate-700"
            style="border: 2px solid #475569"
            title="Follow us on Twitter"
          >
            <i class="fa-brands fa-twitter text-sm"></i>
          </a>
          <a
            href="#"
            class="flex h-10 w-10 items-center justify-center bg-slate-800 text-white transition-colors hover:bg-slate-700"
            style="border: 2px solid #475569"
            title="Follow us on Instagram"
          >
            <i class="fa-brands fa-instagram text-sm"></i>
          </a>
          <a
            href="#"
            class="flex h-10 w-10 items-center justify-center bg-slate-800 text-white transition-colors hover:bg-slate-700"
            style="border: 2px solid #475569"
            title="Follow us on LinkedIn"
          >
            <i class="fa-brands fa-linkedin text-sm"></i>
          </a>
          <a
            href="#"
            class="flex h-10 w-10 items-center justify-center bg-slate-800 text-white transition-colors hover:bg-slate-700"
            style="border: 2px solid #475569"
            title="Follow us on Facebook"
          >
            <i class="fa-brands fa-facebook text-sm"></i>
          </a>
        </div>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div
      class="flex flex-col items-center justify-between gap-8 pt-12 md:flex-row"
      style="border-top: 2px solid #334155"
    >
      <div class="text-sm text-slate-500">
        &copy; 2025 Aucto. All rights reserved.
      </div>
      <div
        class="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500"
      >
        <span class="hidden sm:inline"
          >Built for Noroff Front-End Development</span
        >
        <span class="hidden sm:inline">•</span>
        <span>Oslo, Norway</span>
        <span>•</span>
        <a href="#" class="transition-colors hover:text-slate-300"
          >Student Project</a
        >
      </div>
    </div>
  </div>
</footer>
  `;
}
