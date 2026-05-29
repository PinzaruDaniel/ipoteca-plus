// server.js - IPOTECA PLUS SRL - Main Express Server
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const { pageAuthGuard } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'ipotecaplus_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24h
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
}));

// ─── Page auth (before static so HTML routes are protected) ───────────────────
app.use(pageAuthGuard);

// ─── Static files ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/admin', require('./routes/admin'));

// ─── SPA fallback for HTML pages ────────────────────────────────────────────
const pages = ['/', '/properties', '/contact', '/property', '/login', '/register'];
pages.forEach(route => {
    app.get(route, (req, res) => {
        const file = route === '/' ? 'index' :
            route === '/property' ? 'property' : route.slice(1);
        res.sendFile(path.join(__dirname, 'public', `${file}.html`));
    });
});

app.get('/admin', (req, res) => res.redirect('/admin/dashboard.html'));

// ─── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint inexistent.' });
    }
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// ─── Error handler ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ error: 'Eroare internă de server.' });
});

// ─── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🏠 IPOTECA PLUS SRL - Server running on http://localhost:${PORT}`);
    console.log(`   Admin: http://localhost:${PORT}/admin`);
    console.log(`   ENV: ${process.env.NODE_ENV || 'development'}`);
});