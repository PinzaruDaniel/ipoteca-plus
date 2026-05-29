// routes/admin.js - Admin CRUD endpoints (protected)
const express = require('express');
const db = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(requireAdmin);

async function upsertMainImage(propertyId, imageUrl) {
    if (!imageUrl || !String(imageUrl).trim()) {
        await db.query('DELETE FROM property_images WHERE property_id = ? AND is_main = 1', [propertyId]);
        return;
    }
    const url = String(imageUrl).trim();
    const [existing] = await db.query(
        'SELECT id FROM property_images WHERE property_id = ? AND is_main = 1', [propertyId]
    );
    if (existing.length) {
        await db.query('UPDATE property_images SET image_url = ? WHERE id = ?', [url, existing[0].id]);
    } else {
        await db.query(
            'INSERT INTO property_images (property_id, image_url, is_main, sort_order) VALUES (?,?,1,0)',
            [propertyId, url]
        );
    }
}

// ─── DASHBOARD STATS ───────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const [[props]]  = await db.query('SELECT COUNT(*) as count FROM properties WHERE is_active=1');
        const [[inqs]]   = await db.query("SELECT COUNT(*) as count FROM inquiries WHERE status='new'");
        const [[agents]] = await db.query('SELECT COUNT(*) as count FROM agents WHERE is_active=1');
        const [[views]]  = await db.query('SELECT COALESCE(SUM(views),0) as count FROM properties');
        res.json({
            properties: props.count,
            new_inquiries: inqs.count,
            agents: agents.count,
            total_views: views.count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

// ─── PROPERTIES CRUD ───────────────────────────────────────────────────────
router.get('/properties', async (req, res) => {
    try {
        const { page = 1, limit = 15, search } = req.query;
        let where = [];
        const params = [];
        if (search) {
            where.push('(p.title LIKE ? OR p.city LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM properties p ${whereStr}`, params
        );
        const [rows] = await db.query(
            `SELECT p.*, a.full_name as agent_name,
              COALESCE(p.image_url, pi.image_url) as image_url,
              COALESCE(p.image_url, pi.image_url) as main_image
       FROM properties p
       LEFT JOIN agents a ON p.agent_id = a.id
       LEFT JOIN property_images pi ON pi.property_id = p.id AND pi.is_main = 1
       ${whereStr} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );
        res.json({ data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

router.post('/properties', async (req, res) => {
    const { title, description, type, transaction, price, currency, surface_m2,
        rooms, bathrooms, floor, total_floors, year_built, address, city,
        zone, agent_id, is_featured, is_active, features, image_url } = req.body;
    if (!title || !type || !transaction || !price) {
        return res.status(400).json({ error: 'Câmpurile obligatorii lipsesc.' });
    }
    if (!image_url || !String(image_url).trim()) {
        return res.status(400).json({ error: 'Imaginea este obligatorie.' });
    }
    try {
        const [result] = await db.query(
            `INSERT INTO properties (title, description, type, transaction, price, currency,
        surface_m2, rooms, bathrooms, floor, total_floors, year_built, address, city,
        zone, agent_id, is_featured, is_active, image_url)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [title, description || null, type, transaction, price, currency || 'EUR',
                surface_m2 || null, rooms || null, bathrooms || null, floor || null,
                total_floors || null, year_built || null, address || null, city || null,
                zone || null, agent_id || null, is_featured ? 1 : 0, is_active !== false ? 1 : 0,
                image_url || null]
        );
        const newId = result.insertId;
        if (image_url) await upsertMainImage(newId, image_url);
        if (features && Array.isArray(features)) {
            for (const f of features) {
                if (f.trim()) await db.query('INSERT INTO property_features (property_id, feature) VALUES (?,?)', [newId, f.trim()]);
            }
        }
        res.status(201).json({ success: true, id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

router.put('/properties/:id', async (req, res) => {
    const { title, description, type, transaction, price, currency, surface_m2,
        rooms, bathrooms, floor, total_floors, year_built, address, city,
        zone, agent_id, is_featured, is_active, features, image_url } = req.body;
    try {
        await db.query(
            `UPDATE properties SET title=?, description=?, type=?, transaction=?, price=?,
        currency=?, surface_m2=?, rooms=?, bathrooms=?, floor=?, total_floors=?,
        year_built=?, address=?, city=?, zone=?, agent_id=?, is_featured=?, is_active=?, image_url=?
       WHERE id=?`,
            [title, description || null, type, transaction, price, currency || 'EUR',
                surface_m2 || null, rooms || null, bathrooms || null, floor || null,
                total_floors || null, year_built || null, address || null, city || null,
                zone || null, agent_id || null, is_featured ? 1 : 0, is_active !== false ? 1 : 0,
                image_url || null, req.params.id]
        );
        if (image_url !== undefined) await upsertMainImage(req.params.id, image_url);
        if (features && Array.isArray(features)) {
            await db.query('DELETE FROM property_features WHERE property_id=?', [req.params.id]);
            for (const f of features) {
                if (f.trim()) await db.query('INSERT INTO property_features (property_id, feature) VALUES (?,?)', [req.params.id, f.trim()]);
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

router.delete('/properties/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM properties WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

// ─── AGENTS CRUD ───────────────────────────────────────────────────────────
router.get('/agents', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM agents ORDER BY full_name');
        res.json({ data: rows });
    } catch (err) { res.status(500).json({ error: 'Eroare server.' }); }
});

router.post('/agents', async (req, res) => {
    const { full_name, phone, email, bio, is_active } = req.body;
    if (!full_name) return res.status(400).json({ error: 'Numele este obligatoriu.' });
    try {
        const [result] = await db.query(
            'INSERT INTO agents (full_name, phone, email, bio, is_active) VALUES (?,?,?,?,?)',
            [full_name, phone || null, email || null, bio || null, is_active !== false ? 1 : 0]
        );
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) { res.status(500).json({ error: 'Eroare server.' }); }
});

router.put('/agents/:id', async (req, res) => {
    const { full_name, phone, email, bio, is_active } = req.body;
    try {
        await db.query(
            'UPDATE agents SET full_name=?, phone=?, email=?, bio=?, is_active=? WHERE id=?',
            [full_name, phone || null, email || null, bio || null, is_active !== false ? 1 : 0, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Eroare server.' }); }
});

router.delete('/agents/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM agents WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Eroare server.' }); }
});

// ─── INQUIRIES ─────────────────────────────────────────────────────────────
router.get('/inquiries', async (req, res) => {
    try {
        const { status } = req.query;
        let where = '';
        const params = [];
        if (status) { where = 'WHERE i.status = ?'; params.push(status); }
        const [rows] = await db.query(
            `SELECT i.*, p.title as property_title FROM inquiries i
       LEFT JOIN properties p ON i.property_id = p.id
       ${where} ORDER BY i.created_at DESC`,
            params
        );
        res.json({ data: rows });
    } catch (err) { res.status(500).json({ error: 'Eroare server.' }); }
});

router.put('/inquiries/:id/status', async (req, res) => {
    const { status } = req.body;
    if (!['new', 'read', 'responded'].includes(status)) {
        return res.status(400).json({ error: 'Status invalid.' });
    }
    try {
        await db.query('UPDATE inquiries SET status=? WHERE id=?', [status, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Eroare server.' }); }
});

router.delete('/inquiries/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM inquiries WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Eroare server.' }); }
});

module.exports = router;