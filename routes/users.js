// routes/users.js - Simple user (client) authentication
const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const router = express.Router();

// POST /api/users/register
router.post('/register', async (req, res) => {
    const { full_name, email, password, phone } = req.body;
    if (!full_name || !email || !password) {
        return res.status(400).json({ error: 'Numele, emailul și parola sunt obligatorii.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Parola trebuie să aibă cel puțin 6 caractere.' });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password_hash, phone) VALUES (?,?,?,?)',
            [full_name, email, hash, phone || null]
        );
        req.session.userId = result.insertId;
        req.session.userName = full_name;
        delete req.session.isGuest;
        res.status(201).json({ success: true, name: full_name });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Există deja un cont cu acest email.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Emailul și parola sunt obligatorii.' });
    }
    try {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE email = ?', [email]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credențiale invalide.' });
        }
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Credențiale invalide.' });
        }
        req.session.userId = user.id;
        req.session.userName = user.full_name;
        delete req.session.isGuest;
        res.json({ success: true, name: user.full_name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

// POST /api/users/guest — browse without an account
router.post('/guest', (req, res) => {
    delete req.session.userId;
    delete req.session.userName;
    req.session.isGuest = true;
    res.json({ success: true, guest: true });
});

// POST /api/users/logout
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// GET /api/users/me
router.get('/me', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ authenticated: true, guest: false, name: req.session.userName });
    } else if (req.session && req.session.isGuest) {
        res.json({ authenticated: true, guest: true });
    } else {
        res.json({ authenticated: false, guest: false });
    }
});

module.exports = router;
