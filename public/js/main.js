// public/js/main.js - Shared utilities for all pages

// ─── Navbar scroll effect ─────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
if (navbar) {
    const navCta = document.getElementById('navCta');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
            if (navCta) navCta.style.display = 'inline-flex';
        } else {
            navbar.classList.remove('scrolled');
            if (navCta) navCta.style.display = 'none';
        }
    });
}

// ─── Hamburger menu ───────────────────────────────────────────────────────
const ham = document.getElementById('navHamburger');
const navLinks = document.querySelector('.nav-links');
if (ham && navLinks) {
    ham.addEventListener('click', () => {
        const open = navLinks.style.display === 'flex';
        navLinks.style.display = open ? '' : 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '76px';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.background = 'rgba(13,27,42,.98)';
        navLinks.style.padding = '16px 24px';
        navLinks.style.gap = '4px';
        if (open) navLinks.style.display = 'none';
    });
}

// ─── Active nav link ──────────────────────────────────────────────────────
const currentPath = window.location.pathname;
document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('#')) {
        link.classList.remove('active');
        if (href === '/' && currentPath === '/') link.classList.add('active');
        else if (href !== '/' && currentPath.startsWith(href.split('?')[0])) link.classList.add('active');
    }
});

// ─── Format currency ──────────────────────────────────────────────────────
function formatPrice(price, currency = 'EUR') {
    const n = parseFloat(price);
    if (isNaN(n)) return '—';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + 'M ' + currency;
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K ' + currency;
    return n.toLocaleString('ro-RO') + ' ' + currency;
}

// ─── Type labels ──────────────────────────────────────────────────────────
const typeLabels = {
    apartament: 'Apartament', casa: 'Casă / Vilă', teren: 'Teren',
    comercial: 'Comercial', birou: 'Birou'
};
const transLabels = { vanzare: 'Vânzare', inchiriere: 'Închiriere' };

// ─── Property card renderer ───────────────────────────────────────────────
function renderCard(p) {
    const price = formatPrice(p.price, p.currency);
    const type = typeLabels[p.type] || p.type;
    const trans = p.transaction === 'vanzare' ? 'sale' : '';
    const transLabel = transLabels[p.transaction] || p.transaction;

    const imgHtml = (p.main_image || p.image_url)
        ? `<img src="${p.main_image || p.image_url}" alt="${p.title}" loading="lazy" />`
        : `<div class="prop-img-placeholder">🏠</div>`;

    const meta = [
        p.surface_m2 ? `<div class="prop-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>${p.surface_m2} m²</div>` : '',
        p.rooms ? `<div class="prop-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>${p.rooms} cam.</div>` : '',
        p.bathrooms ? `<div class="prop-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6z"/><path d="M4 12V6a2 2 0 012-2h4v2.4"/></svg>${p.bathrooms} băi</div>` : '',
    ].filter(Boolean).join('');

    return `
    <div class="prop-card" onclick="window.location='/property.html?id=${p.id}'">
      <div class="prop-card-img">
        ${imgHtml}
        <span class="prop-badge ${trans}">${transLabel}</span>
        ${p.is_featured ? '<span class="prop-featured-badge">⭐ Recomandat</span>' : ''}
      </div>
      <div class="prop-card-body">
        <div class="prop-price">${price}<span>/ ${type}</span></div>
        <div class="prop-title">${p.title}</div>
        <div class="prop-location">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${[p.zone, p.city].filter(Boolean).join(', ') || 'N/A'}
        </div>
        ${meta ? `<div class="prop-meta">${meta}</div>` : ''}
      </div>
    </div>
  `;
}