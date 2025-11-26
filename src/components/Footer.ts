/**
 * Render the footer component
 */
export function renderFooter(): void {
  const footer = document.getElementById('footer');
  if (!footer) return;

  const currentYear = new Date().getFullYear();

  footer.innerHTML = `
    <footer class="bg-slate-900 text-white mt-16">
      <div class="mx-auto max-w-7xl px-6 md:px-8 py-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <!-- Brand -->
          <div>
            <div class="flex items-center gap-2 mb-4">
              <svg class="h-8 w-8" width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Aucto icon">
                <path d="M24 108 L64 20 L104 108 Z" fill="none" stroke="currentColor" stroke-width="14" stroke-linejoin="round"/>
                <line x1="40" y1="72" x2="88" y2="72" stroke="currentColor" stroke-width="14" stroke-linecap="round"/>
              </svg>
              <span class="font-serif font-bold text-xl">Aucto</span>
            </div>
            <p class="text-sm text-slate-400">
              Your trusted online auction platform. Buy and sell unique items with confidence.
            </p>
          </div>

          <!-- Quick Links -->
          <div>
            <h3 class="font-serif font-bold text-lg mb-4">Quick Links</h3>
            <ul class="space-y-2 text-sm">
              <li><a href="/index.html" class="text-slate-400 hover:text-white transition-colors">Home</a></li>
              <li><a href="/index.html" class="text-slate-400 hover:text-white transition-colors">Browse Auctions</a></li>
              <li><a href="/register.html" class="text-slate-400 hover:text-white transition-colors">Register</a></li>
              <li><a href="/login.html" class="text-slate-400 hover:text-white transition-colors">Login</a></li>
            </ul>
          </div>

          <!-- Contact Info -->
          <div>
            <h3 class="font-serif font-bold text-lg mb-4">Get in Touch</h3>
            <ul class="space-y-2 text-sm text-slate-400">
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-envelope w-4"></i>
                <span>support@aucto.com</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-phone w-4"></i>
                <span>+47 123 45 678</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="fa-solid fa-map-marker-alt w-4"></i>
                <span>Oslo, Norway</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="border-t border-slate-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
          <p>&copy; ${currentYear} Aucto. All rights reserved.</p>
          <div class="flex gap-4">
            <a href="#" class="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" class="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  `;
}