// routes/auth.js - Admin authentication
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username și parola sunt obligatorii.' });
    }
    try {
        const [rows] = await db.query(
            'SELECT * FROM admins WHERE username = ?', [username]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credențiale invalide.' });
        }
        const admin = rows[0];
        const match = await bcrypt.compare(password, admin.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Credențiale invalide.' });
        }
        req.session.adminId = admin.id;
        req.session.adminName = admin.full_name;
        res.json({ success: true, name: admin.full_name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    if (req.session && req.session.adminId) {
        res.json({ authenticated: true, name: req.session.adminName });
    } else {
        res.json({ authenticated: false });
    }
});

module.exports = router;