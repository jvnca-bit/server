const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let messages = [];

// GET endpoint to fetch chat history
app.get('/chat', (req, res) => {
    res.json(messages.slice(-50)); // Send last 50 messages
});

// POST endpoint to send a new message
app.post('/chat', (req, res) => {
    const { username, userId, message, color } = req.body;
    if (!username || !message || !message.trim()) {
        return res.status(400).json({ error: "Invalid fields" });
    }

    const newMessage = {
        id: Date.now().toString(),
        username: String(username),
        userId: String(userId || 0),
        message: String(message).substring(0, 200),
        color: color || "#5E9BE6",
        timestamp: Math.floor(Date.now() / 1000)
    };

    messages.push(newMessage);
    if (messages.length > 100) messages.shift(); // Keep max 100 messages

    res.json({ success: true, message: newMessage });
});

// DELETE endpoint to fully wipe chat history (Protected with secret admin key)
app.delete('/clear', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    
    // Change "MY_SECRET_ADMIN_KEY_123" to your own private password!
    if (adminKey !== "MY_SECRET_ADMIN_KEY_123") {
        return res.status(403).json({ error: "Unauthorized access" });
    }

    messages = []; // Wipes all chat messages globally
    res.json({ success: true, message: "Chat globally cleared" });
});

app.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT}`);
});
