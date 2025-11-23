const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const SECRET_KEY = 'dot-agents-secret-key-change-this-in-prod';
const USERS_FILE = path.join(__dirname, 'users.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Allow large save data

// Helper to read users
const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        return {};
    }
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading users file:", e);
        return {};
    }
};

// Helper to write users
const writeUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Register
app.post('/api/register', (req, res) => {
    const { username, password, initialData } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
    }

    const users = readUsers();
    if (users[username]) {
        return res.status(409).json({ message: 'User already exists' });
    }

    // In a real app, hash the password!
    users[username] = {
        password: password, // Plaintext for prototype only
        saveData: initialData || null
    };
    writeUsers(users);

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, saveData: users[username].saveData });
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();
    const user = users[username];

    if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, saveData: user.saveData });
});

// Save Game Data
app.post('/api/save', authenticateToken, (req, res) => {
    const { saveData } = req.body;
    const username = req.user.username;
    
    const users = readUsers();
    if (users[username]) {
        users[username].saveData = saveData;
        writeUsers(users);
        res.json({ message: 'Saved successfully' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// Load Game Data
app.get('/api/load', authenticateToken, (req, res) => {
    const username = req.user.username;
    const users = readUsers();
    
    if (users[username]) {
        res.json({ saveData: users[username].saveData });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
