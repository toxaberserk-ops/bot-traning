const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TRAINER_PIN = process.env.TRAINER_PIN || '1234';
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const DB_PATH = path.join(__dirname, 'data.json');

// Инициализация БД
function initDB() {
    if (!fs.existsSync(DB_PATH)) {
        const defaultData = {
            clients: [
                {
                    id: 1,
                    name: 'Иван Петров',
                    telegram_id: null,
                    goal: 'Набор мышечной массы',
                    goalDetails: 'Хочу набрать 10кг чистой массы за 3 месяца',
                    progress: 75,
                    stats: { weight: 85, bodyFat: 18 },
                    notes: [],
                    weights: [{ date: new Date().toISOString().split('T')[0], value: 85 }]
                },
                {
                    id: 2,
                    name: 'Мария Сидорова',
                    telegram_id: null,
                    goal: 'Похудение',
                    goalDetails: 'Похудеть на 15кг здоровым способом',
                    progress: 60,
                    stats: { weight: 72, bodyFat: 28 },
                    notes: [],
                    weights: [{ date: new Date().toISOString().split('T')[0], value: 72 }]
                },
                {
                    id: 3,
                    name: 'Петр Иванов',
                    telegram_id: null,
                    goal: 'Выносливость',
                    goalDetails: 'Подготовиться к полумарафону',
                    progress: 45,
                    stats: { weight: 78, bodyFat: 22 },
                    notes: [],
                    weights: [{ date: new Date().toISOString().split('T')[0], value: 78 }]
                }
            ],
            meals: {},
            workouts: {},
            trainers: []
        };

        defaultData.clients.forEach(client => {
            defaultData.meals[client.id] = [];
            defaultData.workouts[client.id] = [];
        });

        fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
    }
}

function loadDB() {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

initDB();

// ============ API Routes ============

// Вход
app.post('/api/login/trainer', (req, res) => {
    if (req.body.pin === TRAINER_PIN) {
        res.json({ success: true, userType: 'trainer', message: 'Добро пожаловать!' });
    } else {
        res.status(401).json({ success: false, message: 'Неверный пин-код' });
    }
});

app.post('/api/login/client', (req, res) => {
    const db = loadDB();
    const client = db.clients.find(c => c.id == req.body.clientId);
    if (client) {
        res.json({ success: true, userType: 'client', clientId: client.id, name: client.name });
    } else {
        res.status(404).json({ success: false, message: 'Клиент не найден' });
    }
});

// Клиенты
app.get('/api/clients', (req, res) => {
    const db = loadDB();
    const clientsWithStats = db.clients.map(client => ({
        ...client,
        mealsCount: (db.meals[client.id] || []).length,
        workoutsCount: (db.workouts[client.id] || []).length,
        notesCount: (client.notes || []).length
    }));
    res.json(clientsWithStats);
});

app.get('/api/client/:clientId', (req, res) => {
    const db = loadDB();
    const client = db.clients.find(c => c.id == req.params.clientId);
    if (client) {
        res.json({
            ...client,
            meals: db.meals[client.id] || [],
            workouts: db.workouts[client.id] || []
        });
    } else {
        res.status(404).json({ error: 'Client not found' });
    }
});

// Питание
app.post('/api/meal', (req, res) => {
    const { clientId, name, calories, proteins, fats, carbs } = req.body;
    const db = loadDB();
    
    if (!db.meals[clientId]) db.meals[clientId] = [];
    
    const meal = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        name,
        calories: parseInt(calories) || 0,
        proteins: parseInt(proteins) || 0,
        fats: parseInt(fats) || 0,
        carbs: parseInt(carbs) || 0
    };
    
    db.meals[clientId].push(meal);
    saveDB(db);
    
    res.json({ success: true, meal, message: 'Прием пищи добавлен!' });
});

// Тренировки
app.post('/api/workout', (req, res) => {
    const { clientId, type, duration, intensity, exercises } = req.body;
    const db = loadDB();
    
    if (!db.workouts[clientId]) db.workouts[clientId] = [];
    
    const workout = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        type,
        duration: parseInt(duration) || 0,
        intensity,
        exercises: exercises || [],
        calories: Math.round((parseInt(duration) || 0) * (intensity === 'Высокая' ? 10 : intensity === 'Средняя' ? 7 : 5))
    };
    
    db.workouts[clientId].push(workout);
    saveDB(db);
    
    res.json({ success: true, workout, message: 'Тренировка добавлена!' });
});

// Вес
app.post('/api/weight', (req, res) => {
    const { clientId, value } = req.body;
    const db = loadDB();
    const client = db.clients.find(c => c.id == clientId);
    
    if (client) {
        if (!client.weights) client.weights = [];
        client.weights.push({
            date: new Date().toISOString().split('T')[0],
            value: parseFloat(value)
        });
        client.stats.weight = parseFloat(value);
        saveDB(db);
        res.json({ success: true, message: 'Вес записан!' });
    } else {
        res.status(404).json({ error: 'Client not found' });
    }
});

app.get('/api/weights/:clientId', (req, res) => {
    const db = loadDB();
    const client = db.clients.find(c => c.id == req.params.clientId);
    if (client) {
        res.json({ weights: client.weights || [] });
    } else {
        res.status(404).json({ error: 'Client not found' });
    }
});

// Заметки
app.post('/api/note', (req, res) => {
    const { clientId, text } = req.body;
    const db = loadDB();
    const client = db.clients.find(c => c.id == clientId);
    
    if (client) {
        if (!client.notes) client.notes = [];
        client.notes.push({
            id: Date.now(),
            date: new Date().toISOString(),
            text
        });
        saveDB(db);
        res.json({ success: true, message: 'Заметка добавлена!' });
    } else {
        res.status(404).json({ error: 'Client not found' });
    }
});

app.delete('/api/note/:clientId/:noteId', (req, res) => {
    const db = loadDB();
    const client = db.clients.find(c => c.id == req.params.clientId);
    
    if (client && client.notes) {
        client.notes = client.notes.filter(n => n.id != req.params.noteId);
        saveDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// Цель
app.post('/api/goal/:clientId', (req, res) => {
    const { goal, details } = req.body;
    const db = loadDB();
    const client = db.clients.find(c => c.id == req.params.clientId);
    
    if (client) {
        client.goal = goal;
        client.goalDetails = details;
        saveDB(db);
        res.json({ success: true, message: 'Цель обновлена!' });
    } else {
        res.status(404).json({ error: 'Client not found' });
    }
});

// Прогресс
app.post('/api/progress/:clientId', (req, res) => {
    const { progress } = req.body;
    const db = loadDB();
    const client = db.clients.find(c => c.id == req.params.clientId);
    
    if (client) {
        client.progress = Math.min(100, Math.max(0, parseInt(progress) || 0));
        saveDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Client not found' });
    }
});

// HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🤖 Bot token: ${TELEGRAM_BOT_TOKEN ? 'OK' : 'MISSING'}`);
});
