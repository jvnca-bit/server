const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!ADMIN_KEY || ADMIN_KEY.length < 16) {
    console.warn('WARNING: ADMIN_KEY env var is missing or shorter than 16 chars. /clear is disabled.');
}

// Render (and most hosts) sit behind a proxy; needed so rate limits see the real client IP
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '2kb' }));

const readLimiter = rateLimit({ windowMs: 10_000, max: 20, standardHeaders: true, legacyHeaders: false });
const writeLimiter = rateLimit({ windowMs: 10_000, max: 5, standardHeaders: true, legacyHeaders: false });
const clearLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });

let messages = [];
let nextId = 1;

function sha256(s) {
    return crypto.createHash('sha256').update(String(s)).digest();
}

function isAdmin(key) {
    if (!ADMIN_KEY || ADMIN_KEY.length < 16 || typeof key !== 'string') return false;
    // Hash both sides so lengths match and the comparison is constant-time
    return crypto.timingSafeEqual(sha256(key), sha256(ADMIN_KEY));
}

// Fetch chat history
app.get('/chat', readLimiter, (req, res) => {
    res.json(messages.slice(-50));
});

// Send a new message
app.post('/chat', writeLimiter, (req, res) => {
    const { username, userId, message, color } = req.body || {};

    if (typeof username !== 'string' || username.trim().length === 0 || username.length > 32) {
        return res.status(400).json({ error: 'Invalid username' });
    }
    if (typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Invalid message' });
    }

    const uid = Number.isInteger(userId) && userId >= 0 ? userId : 0;
    const safeColor = typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#5E9BE6';

    // Strip control characters
    const clean = (s) => s.replace(/[\u0000-\u001F\u007F]/g, '');

    const newMessage = {
        id: String(nextId++),
        username: clean(username).trim().substring(0, 32),
        userId: String(uid),
        message: clean(message).trim().substring(0, 200),
        color: safeColor,
        timestamp: Math.floor(Date.now() / 1000),
    };

    messages.push(newMessage);
    if (messages.length > 100) messages.shift();

    res.json({ success: true, message: newMessage });
});

// Wipe chat history (protected by admin key from environment variable)
app.delete('/clear', clearLimiter, (req, res) => {
    if (!isAdmin(req.get('x-admin-key'))) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }

    messages = [];
    res.json({ success: true, message: 'Chat globally cleared' });
});

app.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT}`);
});
