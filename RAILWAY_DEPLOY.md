# 🚂 Развертывание на Railway (бесплатно)

Railway - это простая и бесплатная платформа для развертывания Node.js приложений.

## Шаг 1: Подготовка GitHub

```bash
# Инициализируй Git
git init
git add .
git commit -m "Initial commit"

# Создай репозиторий на https://github.com/new
# Назови его: fittrack-bot

# Загрузи код
git remote add origin https://github.com/твой-ник/fittrack-bot.git
git branch -M main
git push -u origin main
```

---

## Шаг 2: Подключить Railway

1. Перейди на https://railway.app
2. Нажми "Login with GitHub" (авторизируйся)
3. Нажми "New Project"
4. Выбери "Deploy from GitHub repo"
5. Выбери `fittrack-bot` репозиторий
6. Нажми "Deploy"

---

## Шаг 3: Добавить переменные окружения

1. В Railway перейди на вкладку "Variables"
2. Добавь:
   - `TELEGRAM_BOT_TOKEN` = `8704481451:AAH4g4PrUrgjnOZnqvcLJgTOUSlHmbdOlQM`
   - `TRAINER_PIN` = `1234`
   - `PORT` = `3000`
   - `NODE_ENV` = `production`

3. Нажми "Deploy"

---

## Шаг 4: Получить URL

1. После деплоя, перейди на вкладку "Settings"
2. Найди "Public Networking"
3. Нажми "Generate Domain"
4. Скопируй URL типа: `https://fittrack-bot-production.up.railway.app`

---

## Шаг 5: Регистрировать Web App в BotFather

1. Напиши **@BotFather**
2. Отправь `/setmenubutton`
3. Выбери бота
4. Нажми "Web App"
5. **Text:** `Открыть FitTrack`
6. **URL:** `https://твой-railway-url.up.railway.app`

✅ Готово!

---

## 🔄 После каждого обновления кода

```bash
git add .
git commit -m "Update: описание изменений"
git push origin main
```

Railway автоматически перезапустит приложение!

---

## 📊 Мониторинг

В Railway можно смотреть:
- Логи приложения
- Использование памяти
- Статус развертывания

Всё видно на главной странице проекта.

---

## 💰 Цена

- **Бесплатно:** $5 кредит каждый месяц
- Для маленького приложения этого достаточно
- Если переплатишь - нужно платить, но обычно помещается в бесплатный план

---

## 🆘 Если что-то не работает

### Приложение падает при старте
1. Нажми на логи (Logs)
2. Посмотри ошибку
3. Обычно это неправильные переменные окружения

### Данные не сохраняются
На Railway файлы удаляются при рестарте. Нужна настоящая БД (Firebase, PostgreSQL)

### Нет доступа к переменным
Убедись что Variables сохранены и нажал Deploy

---

**Railway > Vercel для простых приложений! 🚀**
