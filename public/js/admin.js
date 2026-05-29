// public/js/admin.js - Admin dashboard logic

const typeLabels = {
    apartament: 'Apartament', casa: 'Casă / Vilă', teren: 'Teren',
    comercial: 'Comercial', birou: 'Birou'
};
const transLabels = { vanzare: 'Vânzare', inchiriere: 'Închiriere' };
const inqStatusLabels = { new: 'Nou', read: 'Citit', responded: 'Răspuns' };

let agents = [];
let propertiesCache = [];
let currentPage = 1;
let propertySearch = '';
let editingPropertyId = null;
let editingAgentId = null;

// ─── Auth ───────────────────────────────────────────────────────────────────
async function initAuth() {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const data = await res.json();
    if (!data.authenticated) {
        window.location = '/admin/login.html';
        return null;
    }
    const name = data.name || 'Admin';
    document.getElementById('adminName').textContent = name;
    document.getElementById('adminAvatar').textContent = name.charAt(0).toUpperCase();
    return data;
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location = '/admin/login.html';
}

// ─── API helper ─────────────────────────────────────────────────────────────
async function api(path, options = {}) {
    const res = await fetch(path, { credentials: 'include', ...options });
    if (res.status === 401) {
        window.location = '/admin/login.html';
        throw new Error('Unauthorized');
    }
    const json = await res.json();
    if (!res.ok) {
        const err = new Error(json.error || 'Eroare server.');
        err.apiError = json.error;
        throw err;
    }
    return json;
}

function formatPrice(price, currency = 'EUR') {
    const n = parseFloat(price);
    if (isNaN(n)) return '—';
    return n.toLocaleString('ro-RO') + ' ' + currency;
}

function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Navigation ─────────────────────────────────────────────────────────────
function showSection(name) {
    document.querySelectorAll('[data-section]').forEach(el => {
        el.hidden = el.dataset.section !== name;
    });
    document.querySelectorAll('.sidebar-link[data-nav]').forEach(link => {
        link.classList.toggle('active', link.dataset.nav === name);
    });
    const titles = {
        dashboard: 'Panou de control',
        properties: 'Proprietăți',
        agents: 'Agenți',
        inquiries: 'Solicitări'
    };
    document.getElementById('topbarTitle').textContent = titles[name] || 'Admin';
    if (name === 'properties') loadProperties();
    if (name === 'agents') loadAgents();
    if (name === 'inquiries') loadInquiries();
}

// ─── Stats ──────────────────────────────────────────────────────────────────
async function loadStats() {
    try {
        const stats = await api('/api/admin/stats');
        document.getElementById('statProperties').textContent = stats.properties ?? 0;
        document.getElementById('statInquiries').textContent = stats.new_inquiries ?? 0;
        document.getElementById('statAgents').textContent = stats.agents ?? 0;
        document.getElementById('statViews').textContent = Number(stats.total_views ?? 0).toLocaleString('ro-RO');
        const badge = document.getElementById('inqBadge');
        if (badge) {
            const count = stats.new_inquiries ?? 0;
            badge.textContent = count;
            badge.style.display = count > 0 ? '' : 'none';
        }
    } catch (err) {
        console.error(err);
    }
}

// ─── Properties ─────────────────────────────────────────────────────────────
async function loadProperties(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('propertiesBody');
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><span class="spinner"></span></td></tr>';
    try {
        const params = new URLSearchParams({ page, limit: 15 });
        if (propertySearch) params.set('search', propertySearch);
        const json = await api('/api/admin/properties?' + params);
        const rows = json.data || [];
        propertiesCache = rows;
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>Nicio proprietate găsită.</p></div></td></tr>';
        } else {
            tbody.innerHTML = rows.map(p => {
                const img = p.image_url || p.main_image;
                const imgCell = img
                    ? `<img src="${esc(img)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:8px;" />`
                    : '<span style="color:var(--gray-400);font-size:.8rem;">—</span>';
                return `
                <tr>
                    <td>${imgCell}</td>
                    <td class="td-title" title="${esc(p.title)}">${esc(p.title)}</td>
                    <td>${typeLabels[p.type] || p.type}</td>
                    <td><span class="badge badge-${p.transaction === 'vanzare' ? 'sale' : 'rent'}">${transLabels[p.transaction] || p.transaction}</span></td>
                    <td>${formatPrice(p.price, p.currency)}</td>
                    <td>${esc([p.zone, p.city].filter(Boolean).join(', ') || '—')}</td>
                    <td><span class="badge badge-${p.is_active ? 'active' : 'inactive'}">${p.is_active ? 'Activ' : 'Inactiv'}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="act-btn act-edit" title="Editează" onclick="openPropertyModal(${p.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="act-btn act-delete" title="Șterge" onclick="deleteProperty(${p.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            }).join('');
        }
        renderPagination('propertiesPagination', json.pagination, loadProperties);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>Eroare la încărcare.</p></div></td></tr>';
    }
}

async function openPropertyModal(id = null) {
    editingPropertyId = id;
    document.getElementById('propertyModalTitle').textContent = id ? 'Editează proprietate' : 'Adaugă proprietate';
    document.getElementById('propertyForm').reset();
    document.getElementById('propFeatured').checked = false;
    document.getElementById('propActive').checked = true;
    document.getElementById('propImageUrl').required = !id;
    await ensureAgentsLoaded();
    fillAgentSelect('propAgent');
    if (id) {
        let p = propertiesCache.find(x => x.id === id);
        if (!p) {
            const json = await api('/api/admin/properties?page=1&limit=200');
            p = (json.data || []).find(x => x.id === id);
        }
        if (p) fillPropertyForm(p);
    }
    openModal('propertyModal');
}

function fillPropertyForm(p) {
    document.getElementById('propTitle').value = p.title || '';
    document.getElementById('propDescription').value = p.description || '';
    document.getElementById('propType').value = p.type || 'apartament';
    document.getElementById('propTransaction').value = p.transaction || 'vanzare';
    document.getElementById('propPrice').value = p.price || '';
    document.getElementById('propCurrency').value = p.currency || 'EUR';
    document.getElementById('propSurface').value = p.surface_m2 || '';
    document.getElementById('propRooms').value = p.rooms || '';
    document.getElementById('propBathrooms').value = p.bathrooms || '';
    document.getElementById('propFloor').value = p.floor ?? '';
    document.getElementById('propTotalFloors').value = p.total_floors ?? '';
    document.getElementById('propYear').value = p.year_built || '';
    document.getElementById('propAddress').value = p.address || '';
    document.getElementById('propCity').value = p.city || '';
    document.getElementById('propZone').value = p.zone || '';
    document.getElementById('propAgent').value = p.agent_id || '';
    document.getElementById('propImageUrl').value = p.image_url || p.main_image || '';
    document.getElementById('propFeatured').checked = !!p.is_featured;
    document.getElementById('propActive').checked = p.is_active !== 0 && p.is_active !== false;
}

async function saveProperty(e) {
    e.preventDefault();
    const imageUrl = document.getElementById('propImageUrl').value.trim();
    if (!editingPropertyId && !imageUrl) {
        alert('Imaginea este obligatorie.');
        document.getElementById('propImageUrl').focus();
        return;
    }
    const body = {
        title: document.getElementById('propTitle').value.trim(),
        description: document.getElementById('propDescription').value.trim(),
        type: document.getElementById('propType').value,
        transaction: document.getElementById('propTransaction').value,
        price: parseFloat(document.getElementById('propPrice').value),
        currency: document.getElementById('propCurrency').value,
        surface_m2: numOrNull('propSurface'),
        rooms: intOrNull('propRooms'),
        bathrooms: intOrNull('propBathrooms'),
        floor: intOrNull('propFloor'),
        total_floors: intOrNull('propTotalFloors'),
        year_built: intOrNull('propYear'),
        address: document.getElementById('propAddress').value.trim() || null,
        city: document.getElementById('propCity').value.trim() || null,
        zone: document.getElementById('propZone').value.trim() || null,
        agent_id: document.getElementById('propAgent').value || null,
        image_url: imageUrl || null,
        is_featured: document.getElementById('propFeatured').checked,
        is_active: document.getElementById('propActive').checked
    };
    const url = editingPropertyId
        ? `/api/admin/properties/${editingPropertyId}`
        : '/api/admin/properties';
    const method = editingPropertyId ? 'PUT' : 'POST';
    try {
        await api(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        closeModal('propertyModal');
        loadProperties(currentPage);
        loadStats();
        loadRecentInquiries();
    } catch (err) {
        alert(err.message === 'Unauthorized' ? 'Sesiune expirată.' : (err.apiError || 'Eroare la salvare.'));
    }
}

async function deleteProperty(id) {
    if (!confirm('Sigur doriți să ștergeți această proprietate?')) return;
    await api(`/api/admin/properties/${id}`, { method: 'DELETE' });
    loadProperties(currentPage);
    loadStats();
}

// ─── Agents ─────────────────────────────────────────────────────────────────
async function ensureAgentsLoaded() {
    if (agents.length) return;
    const json = await api('/api/admin/agents');
    agents = json.data || [];
}

async function loadAgents() {
    const tbody = document.getElementById('agentsBody');
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><span class="spinner"></span></td></tr>';
    try {
        await ensureAgentsLoaded();
        agents = (await api('/api/admin/agents')).data || [];
        if (!agents.length) {
            tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>Niciun agent înregistrat.</p></div></td></tr>';
        } else {
            tbody.innerHTML = agents.map(a => `
                <tr>
                    <td class="td-title">${esc(a.full_name)}</td>
                    <td>${esc(a.phone || '—')}</td>
                    <td>${esc(a.email || '—')}</td>
                    <td><span class="badge badge-${a.is_active ? 'active' : 'inactive'}">${a.is_active ? 'Activ' : 'Inactiv'}</span></td>
                    <td>
                        <div class="action-btns">
                            <button class="act-btn act-edit" title="Editează" onclick="openAgentModal(${a.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button class="act-btn act-delete" title="Șterge" onclick="deleteAgent(${a.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>Eroare la încărcare.</p></div></td></tr>';
    }
}

function fillAgentSelect(selectId) {
    const sel = document.getElementById(selectId);
    sel.innerHTML = '<option value="">— Fără agent —</option>' +
        agents.map(a => `<option value="${a.id}">${esc(a.full_name)}</option>`).join('');
}

function openAgentModal(id = null) {
    editingAgentId = id;
    document.getElementById('agentModalTitle').textContent = id ? 'Editează agent' : 'Adaugă agent';
    document.getElementById('agentForm').reset();
    document.getElementById('agentActive').checked = true;
    if (id) {
        const a = agents.find(x => x.id === id);
        if (a) {
            document.getElementById('agentName').value = a.full_name || '';
            document.getElementById('agentPhone').value = a.phone || '';
            document.getElementById('agentEmail').value = a.email || '';
            document.getElementById('agentBio').value = a.bio || '';
            document.getElementById('agentActive').checked = a.is_active !== 0 && a.is_active !== false;
        }
    }
    openModal('agentModal');
}

async function saveAgent(e) {
    e.preventDefault();
    const body = {
        full_name: document.getElementById('agentName').value.trim(),
        phone: document.getElementById('agentPhone').value.trim() || null,
        email: document.getElementById('agentEmail').value.trim() || null,
        bio: document.getElementById('agentBio').value.trim() || null,
        is_active: document.getElementById('agentActive').checked
    };
    const url = editingAgentId ? `/api/admin/agents/${editingAgentId}` : '/api/admin/agents';
    const method = editingAgentId ? 'PUT' : 'POST';
    try {
        await api(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        agents = [];
        closeModal('agentModal');
        loadAgents();
        loadStats();
    } catch (err) {
        alert('Eroare la salvare.');
    }
}

async function deleteAgent(id) {
    if (!confirm('Sigur doriți să ștergeți acest agent?')) return;
    await api(`/api/admin/agents/${id}`, { method: 'DELETE' });
    agents = agents.filter(a => a.id !== id);
    loadAgents();
    loadStats();
}

// ─── Inquiries ──────────────────────────────────────────────────────────────
async function loadInquiries() {
    const tbody = document.getElementById('inquiriesBody');
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="spinner"></span></td></tr>';
    try {
        const json = await api('/api/admin/inquiries');
        renderInquiriesTable(json.data || [], tbody, true);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>Eroare la încărcare.</p></div></td></tr>';
    }
}

async function loadRecentInquiries() {
    const tbody = document.getElementById('recentInquiriesBody');
    try {
        const json = await api('/api/admin/inquiries');
        const recent = (json.data || []).slice(0, 5);
        renderInquiriesTable(recent, tbody, false);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>Eroare la încărcare.</p></div></td></tr>';
    }
}

function renderInquiriesTable(rows, tbody, showActions) {
    if (!rows.length) {
        const cols = showActions ? 6 : 5;
        tbody.innerHTML = `<tr><td colspan="${cols}"><div class="empty-state"><p>Nicio solicitare.</p></div></td></tr>`;
        return;
    }
    tbody.innerHTML = rows.map(i => `
        <tr>
            <td class="td-title">${esc(i.full_name)}</td>
            <td>${esc(i.property_title || '—')}</td>
            <td>${esc(i.phone || i.email || '—')}</td>
            <td>${formatDate(i.created_at)}</td>
            <td>
                ${showActions ? `
                    <select class="form-control" style="padding:6px 10px;font-size:.82rem;width:auto;" onchange="updateInquiryStatus(${i.id}, this.value)">
                        ${['new','read','responded'].map(s => `<option value="${s}" ${i.status === s ? 'selected' : ''}>${inqStatusLabels[s]}</option>`).join('')}
                    </select>
                ` : `<span class="badge badge-${i.status}">${inqStatusLabels[i.status] || i.status}</span>`}
            </td>
            ${showActions ? `
                <td>
                    <button class="act-btn act-delete" title="Șterge" onclick="deleteInquiry(${i.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                    </button>
                </td>
            ` : ''}
        </tr>
    `).join('');
}

async function updateInquiryStatus(id, status) {
    await api(`/api/admin/inquiries/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    loadStats();
    loadRecentInquiries();
}

async function deleteInquiry(id) {
    if (!confirm('Sigur doriți să ștergeți această solicitare?')) return;
    await api(`/api/admin/inquiries/${id}`, { method: 'DELETE' });
    loadInquiries();
    loadStats();
    loadRecentInquiries();
}

// ─── Utilities ──────────────────────────────────────────────────────────────
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function numOrNull(id) {
    const v = document.getElementById(id).value;
    return v === '' ? null : parseFloat(v);
}

function intOrNull(id) {
    const v = document.getElementById(id).value;
    return v === '' ? null : parseInt(v, 10);
}

function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

function renderPagination(containerId, pagination, onPage) {
    const el = document.getElementById(containerId);
    if (!el || !pagination || pagination.pages <= 1) {
        if (el) el.innerHTML = '';
        return;
    }
    const { page, pages } = pagination;
    el.innerHTML = '';
    const prev = document.createElement('button');
    prev.className = 'pg-btn';
    prev.innerHTML = '&lsaquo;';
    prev.disabled = page <= 1;
    prev.addEventListener('click', () => onPage(page - 1));
    el.appendChild(prev);
    for (let i = 1; i <= pages; i++) {
        const btn = document.createElement('button');
        btn.className = 'pg-btn' + (i === page ? ' active' : '');
        btn.textContent = i;
        btn.addEventListener('click', () => onPage(i));
        el.appendChild(btn);
    }
    const next = document.createElement('button');
    next.className = 'pg-btn';
    next.innerHTML = '&rsaquo;';
    next.disabled = page >= pages;
    next.addEventListener('click', () => onPage(page + 1));
    el.appendChild(next);
}

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const auth = await initAuth();
    if (!auth) return;

    document.querySelectorAll('.sidebar-link[data-nav]').forEach(link => {
        link.addEventListener('click', () => showSection(link.dataset.nav));
    });
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.getElementById('addPropertyBtn').addEventListener('click', () => openPropertyModal());
    document.getElementById('addAgentBtn').addEventListener('click', () => openAgentModal());
    document.getElementById('propertyForm').addEventListener('submit', saveProperty);
    document.getElementById('agentForm').addEventListener('submit', saveAgent);

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });

    let searchTimer;
    const searchInput = document.getElementById('propertySearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                propertySearch = searchInput.value.trim();
                loadProperties(1);
            }, 300);
        });
    }

    await loadStats();
    await loadRecentInquiries();
});
