// routes/properties.js - Public property endpoints
const express = require('express');
const db = require('../config/db');
const router = express.Router();

const SORT_OPTIONS = {
    newest: 'p.is_featured DESC, p.created_at DESC',
    price_asc: 'p.price ASC',
    price_desc: 'p.price DESC',
    surface: 'p.surface_m2 DESC, p.created_at DESC',
};

// GET /api/properties - list with filters & pagination
router.get('/', async (req, res) => {
    try {
        const {
            type, transaction, city, minPrice, maxPrice,
            minSurface, maxSurface, rooms, featured,
            page = 1, limit = 9, search, sortBy
        } = req.query;

        let where = ['p.is_active = 1'];
        const params = [];

        if (type) { where.push('p.type = ?'); params.push(type); }
        if (transaction) { where.push('p.transaction = ?'); params.push(transaction); }
        if (city) { where.push('p.city LIKE ?'); params.push(`%${city}%`); }
        if (minPrice) { where.push('p.price >= ?'); params.push(minPrice); }
        if (maxPrice) { where.push('p.price <= ?'); params.push(maxPrice); }
        if (minSurface) { where.push('p.surface_m2 >= ?'); params.push(minSurface); }
        if (maxSurface) { where.push('p.surface_m2 <= ?'); params.push(maxSurface); }
        if (rooms) { where.push('p.rooms = ?'); params.push(rooms); }
        if (featured === 'true') { where.push('p.is_featured = 1'); }
        if (search) {
            where.push('(p.title LIKE ? OR p.address LIKE ? OR p.zone LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const whereStr = where.length ? 'WHERE ' + where.join(' AND ') : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const orderBy = SORT_OPTIONS[sortBy] || SORT_OPTIONS.newest;

        const [countRows] = await db.query(
            `SELECT COUNT(*) as total FROM properties p ${whereStr}`, params
        );
        const total = countRows[0].total;

        const [rows] = await db.query(
            `SELECT p.*, a.full_name as agent_name, a.phone as agent_phone,
              COALESCE(p.image_url, pi.image_url) as main_image,
              COALESCE(p.image_url, pi.image_url) as image_url
       FROM properties p
       LEFT JOIN agents a ON p.agent_id = a.id
       LEFT JOIN property_images pi ON pi.property_id = p.id AND pi.is_main = 1
       ${whereStr}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), offset]
        );

        res.json({
            data: rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

// GET /api/properties/:id - single property detail
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.*, a.full_name as agent_name, a.phone as agent_phone, a.email as agent_email
       FROM properties p
       LEFT JOIN agents a ON p.agent_id = a.id
       WHERE p.id = ? AND p.is_active = 1`,
            [req.params.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Proprietatea nu a fost găsită.' });

        const property = rows[0];

        const [images] = await db.query(
            'SELECT * FROM property_images WHERE property_id = ? ORDER BY is_main DESC, sort_order ASC',
            [property.id]
        );
        const [features] = await db.query(
            'SELECT feature FROM property_features WHERE property_id = ?',
            [property.id]
        );

        const mainImage = property.image_url || images[0]?.image_url || null;
        if (mainImage && !images.length) {
            images.push({ id: null, property_id: property.id, image_url: mainImage, is_main: 1, sort_order: 0 });
        }

        // Increment views
        await db.query('UPDATE properties SET views = views + 1 WHERE id = ?', [property.id]);

        res.json({
            ...property,
            main_image: mainImage,
            image_url: mainImage,
            images,
            features: features.map(f => f.feature)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

// POST /api/properties/:id/inquiry - submit inquiry
router.post('/:id/inquiry', async (req, res) => {
    const { full_name, phone, email, message } = req.body;
    if (!full_name || (!phone && !email)) {
        return res.status(400).json({ error: 'Numele și datele de contact sunt obligatorii.' });
    }
    try {
        await db.query(
            'INSERT INTO inquiries (property_id, full_name, phone, email, message) VALUES (?,?,?,?,?)',
            [req.params.id, full_name, phone || null, email || null, message || null]
        );
        res.json({ success: true, message: 'Cererea dvs. a fost trimisă. Vă vom contacta în curând!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

// POST /api/contact - general contact form
router.post('/contact/general', async (req, res) => {
    const { full_name, phone, email, message } = req.body;
    if (!full_name || !message) {
        return res.status(400).json({ error: 'Completați câmpurile obligatorii.' });
    }
    try {
        await db.query(
            'INSERT INTO inquiries (full_name, phone, email, message) VALUES (?,?,?,?)',
            [full_name, phone || null, email || null, message]
        );
        res.json({ success: true, message: 'Mesajul dvs. a fost trimis cu succes!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Eroare server.' });
    }
});

module.exports = router;