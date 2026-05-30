// middleware/auth.js - Session-based auth guards

const PUBLIC_PAGES = new Set([
    '/login.html', '/login',
    '/register.html', '/register',
    '/admin/login.html',
]);

const PROTECTED_USER_PAGES = new Set([
    '/index.html', '/',
    '/properties.html', '/properties',
    '/property.html', '/property',
    '/contact',
]);

function isAssetPath(path) {
    return path.startsWith('/css/') ||
        path.startsWith('/js/') ||
        /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|map)$/i.test(path);
}

function hasUserAccess(session) {
    return session && (session.userId || session.isGuest);
}

function pageAuthGuard(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    const path = req.path.split('?')[0];

    if (path.startsWith('/api/') || isAssetPath(path)) return next();
    if (PUBLIC_PAGES.has(path)) return next();

    if (path.startsWith('/admin')) {
        if (req.session && req.session.adminId) return next();
        return res.redirect('/admin/login.html');
    }

    if (path === '/' || path === '/index.html') {
        if (req.session && req.session.adminId) {
            return res.redirect('/admin/dashboard.html');
        }
        if (hasUserAccess(req.session)) return next();
        return res.redirect('/login.html');
    }

    if (PROTECTED_USER_PAGES.has(path)) {
        if (hasUserAccess(req.session) || (req.session && req.session.adminId)) {
            return next();
        }
        return res.redirect('/login.html');
    }

    return next();
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.adminId) {
        return next();
    }
    if (req.headers['content-type'] === 'application/json' ||
        req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Neautorizat. Vă rugăm să vă autentificați.' });
    }
    return res.redirect('/admin/login.html');
}

function requireUser(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Neautorizat. Vă rugăm să vă autentificați.' });
    }
    return res.redirect('/login.html');
}

module.exports = { requireAdmin, requireUser, pageAuthGuard };