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
    const { username, userId, message } = req.body;
    if (!username || !message || !message.trim()) {
        return res.status(400).json({ error: "Invalid fields" });
    }

    const newMessage = {
        id: Date.now().toString(),
        username: String(username),
        userId: String(userId || 0),
        message: String(message).substring(0, 200),
        timestamp: Math.floor(Date.now() / 1000)
    };

    messages.push(newMessage);
    if (messages.length > 100) messages.shift(); // Keep max 100 messages

    res.json({ success: true, message: newMessage });
});

app.listen(PORT, () => {
    console.log(`Chat server running on port ${PORT}`);
});
