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
    credentials: false,
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TRAINER_PIN = process.env.TRAINER_PIN || '1234';

const DB_PATH = path.join(__dirname, 'data.json');

function initDB() {
    if (!fs.existsSync(DB_PATH)) {
        const defaultData = {
            clients: [
                {
                    id: 1,
                    name: 'Иван Петров',
                    username: 'ivan',
                    password: '1234',
                    telegram_id: null,
                    goal: 'Набор мышечной массы',
                    goalDetails: 'Хочу набрать 10кг чистой массы за 3 месяца',
                    progress: 75,
                    stats: { weight: 85, bodyFat: 18 },
                    notes: [],
                    weights: [{ date: new Date().toISOString().split('T')[0], value: 85 }]
                }
            ],
            meals: { 1: [] },
            workouts: { 1: [] },
            announcements: [],
            trainers: []
        };
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

// ============ Вход ============

app.post('/api/login/trainer', (req, res) => {
    if (req.body.pin === TRAINER_PIN) {
        res.json({ success: true, userType: 'trainer', message: 'Добро пожаловать!' });
    } else {
        res.status(401).json({ success: false, message: 'Неверный пин-код' });
    }
});

app.post('/api/login/client', (req, res) => {
    const { username, password } = req.body;
    const db = loadDB();
    const client = db.clients.find(c => c.username === username && c.password === password);
    
    if (client) {
        res.json({ success: true, userType: 'client', clientId: client.id, name: client.name });
    } else {
        res.status(401).json({ success: false, message: 'Неверные логин или пароль' });
    }
});

// ============ Клиенты ============

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

app.post('/api/create-client', (req, res) => {
    const { name, username, password, goal, goalDetails } = req.body;
    const db = loadDB();
    
    if (!name || !username || !password) {
        return res.status(400).json({ success: false, message: 'Заполните все поля' });
    }
    
    if (db.clients.find(c => c.username === username)) {
        return res.status(400).json({ success: false, message: 'Этот логин уже используется' });
    }
    
    const newId = Math.max(...db.clients.map(c => c.id), 0) + 1;
    const newClient = {
        id: newId,
        name,
        username,
        password,
        telegram_id: null,
        goal: goal || 'Без цели',
        goalDetails: goalDetails || '',
        progress: 0,
        stats: { weight: 0, bodyFat: 0 },
        notes: [],
        weights: []
    };
    
    db.clients.push(newClient);
    db.meals[newId] = [];
    db.workouts[newId] = [];
    saveDB(db);
    
    res.json({ success: true, client: newClient, message: 'Клиент добавлен!' });
});

app.delete('/api/client/:clientId', (req, res) => {
    const db = loadDB();
    const index = db.clients.findIndex(c => c.id == req.params.clientId);
    
    if (index !== -1) {
        const clientId = db.clients[index].id;
        db.clients.splice(index, 1);
        delete db.meals[clientId];
        delete db.workouts[clientId];
        saveDB(db);
        res.json({ success: true, message: 'Клиент удален!' });
    } else {
        res.status(404).json({ success: false, message: 'Клиент не найден' });
    }
});

// ============ Питание ============

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

// ============ Тренировки ============

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

// ============ Вес ============

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

// ============ Цели и прогресс ============

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

// ============ Заметки ============

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

// ============ Объявления ============

app.get('/api/announcements', (req, res) => {
    const db = loadDB();
    res.json(db.announcements || []);
});

app.post('/api/announcement', (req, res) => {
    const { text } = req.body;
    const db = loadDB();
    
    if (!text) {
        return res.status(400).json({ success: false, message: 'Текст не может быть пустым' });
    }
    
    if (!db.announcements) db.announcements = [];
    
    const announcement = {
        id: Date.now(),
        date: new Date().toISOString(),
        text
    };
    
    db.announcements.unshift(announcement);
    saveDB(db);
    res.json({ success: true, announcement, message: 'Объявление добавлено!' });
});

app.delete('/api/announcement/:id', (req, res) => {
    const db = loadDB();
    
    if (!db.announcements) db.announcements = [];
    
    const index = db.announcements.findIndex(a => a.id == req.params.id);
    if (index !== -1) {
        db.announcements.splice(index, 1);
        saveDB(db);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

// ============ Активность по датам ============

app.get('/api/activity/:date', (req, res) => {
    const { date } = req.params;
    const db = loadDB();
    
    const activity = db.clients.map(client => {
        const meals = (db.meals[client.id] || []).filter(m => m.date === date);
        const workouts = (db.workouts[client.id] || []).filter(w => w.date === date);
        
        const totalCalories = meals.reduce((sum, m) => sum + (m.calories || 0), 0);
        const totalDuration = workouts.reduce((sum, w) => sum + (w.duration || 0), 0);
        
        return {
            clientId: client.id,
            clientName: client.name,
            meals,
            workouts,
            stats: {
                mealsCount: meals.length,
                totalCalories,
                workoutsCount: workouts.length,
                totalDuration
            }
        };
    });
    
    res.json({ date, activity });
});

// ============ План тренировок ============

app.post('/api/plan/:clientId', (req, res) => {
    const { clientId } = req.params;
    const { plan } = req.body;
    const db = loadDB();
    
    if (!db.plans) db.plans = {};
    
    db.plans[clientId] = {
        clientId,
        plan,
        createdAt: new Date().toISOString(),
        progress: {}
    };
    
    saveDB(db);
    res.json({ success: true, message: 'План сохранён!' });
});

app.get('/api/plan/:clientId', (req, res) => {
    const { clientId } = req.params;
    const db = loadDB();
    
    if (!db.plans) db.plans = {};
    
    const plan = db.plans[clientId] || null;
    res.json(plan);
});

// Отметить упражнение как выполненное
app.post('/api/workout-progress', (req, res) => {
    const { clientId, day, exerciseIndex, completed } = req.body;
    const db = loadDB();
    
    if (!db.plans) db.plans = {};
    if (!db.plans[clientId]) db.plans[clientId] = { progress: {} };
    if (!db.plans[clientId].progress[day]) db.plans[clientId].progress[day] = {};
    
    db.plans[clientId].progress[day][exerciseIndex] = completed;
    saveDB(db);
    res.json({ success: true });
});

// Комментарий к дню
app.post('/api/plan-comment', (req, res) => {
    const { clientId, day, text } = req.body;
    const db = loadDB();
    
    if (!db.planComments) db.planComments = {};
    if (!db.planComments[clientId]) db.planComments[clientId] = {};
    if (!db.planComments[clientId][day]) db.planComments[clientId][day] = [];
    
    db.planComments[clientId][day].push({
        id: Date.now(),
        date: new Date().toISOString(),
        text
    });
    
    saveDB(db);
    res.json({ success: true });
});

app.get('/api/plan-comments/:clientId/:day', (req, res) => {
    const { clientId, day } = req.params;
    const db = loadDB();
    
    if (!db.planComments || !db.planComments[clientId] || !db.planComments[clientId][day]) {
        return res.json([]);
    }
    
    res.json(db.planComments[clientId][day]);
});

// Статистика прохождения
app.get('/api/plan-stats/:clientId', (req, res) => {
    const { clientId } = req.params;
    const db = loadDB();
    
    if (!db.plans || !db.plans[clientId]) {
        return res.json({ stats: {} });
    }
    
    const plan = db.plans[clientId];
    const stats = {};
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    days.forEach(day => {
        if (plan.plan && plan.plan[day]) {
            const exercises = plan.plan[day];
            const completed = plan.progress[day] ? Object.values(plan.progress[day]).filter(c => c).length : 0;
            stats[day] = {
                total: exercises.length,
                completed: completed,
                percent: Math.round((completed / exercises.length) * 100) || 0
            };
        }
    });
    
    res.json({ stats });
});

// ============ Статические файлы ============

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🤖 Bot token: ${TELEGRAM_BOT_TOKEN ? 'OK' : 'MISSING'}`);
});
