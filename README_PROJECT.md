# Online Kurs Platformasi - API Documentation

## О проекте

Online Kurs Platformasi - это платформа для онлайн-обучения, разработанная с использованием FastAPI. Платформа позволяет пользователям регистрироваться, просматривать и записываться на курсы, смотреть видеоуроки, оставлять комментарии и оценивать содержимое.

## Технологии

- FastAPI (веб-фреймворк)
- SQLAlchemy (ORM)
- Pydantic (валидация данных)
- JWT (аутентификация)
- SQLite (база данных)
- Alembic (миграции БД)
- Pytest (тестирование)

## Установка и запуск

### Шаг 1: Установить зависимости

```bash
pip install -r requirements.txt
```

### Шаг 2: Настроить переменные окружения

Проект использует файл `.env` для конфигурации. Файл уже создан с примерными значениями:

```
DATABASE_URL=sqlite:///./online_courses.db
SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Шаг 3: Запустить миграции базы данных

```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### Шаг 4: Запустить сервер разработки

```bash
uvicorn main:app --reload
```

После запуска API будет доступен по адресу: http://localhost:8000

Документация API (Swagger UI): http://localhost:8000/docs

## Структура проекта

```
.
├── app/
│   ├── routers/          # API маршруты
│   ├── database.py       # Конфигурация базы данных
│   ├── models.py         # SQLAlchemy модели
│   ├── schemas.py        # Pydantic схемы
│   └── security.py       # JWT аутентификация
├── alembic/              # Миграции базы данных
├── tests/                # Тесты
├── .env                  # Переменные окружения
├── main.py               # Точка входа
└── requirements.txt      # Зависимости
```

## API Endpoints

### Аутентификация (Authentication)

* `POST /auth/register` - Регистрация нового пользователя
* `POST /auth/token` - Получение JWT токена (логин)

### Пользователи (Users)

* `GET /users/me` - Получение информации о текущем пользователе
* `PUT /users/me` - Обновление данных текущего пользователя
* `GET /users/` - Получение списка всех пользователей (админ)
* `GET /users/{user_id}` - Получение информации о конкретном пользователе (админ)
* `PUT /users/{user_id}` - Обновление данных пользователя (админ)

### Курсы (Courses)

* `POST /courses/` - Создание нового курса
* `GET /courses/` - Получение списка всех курсов (с поиском)
* `GET /courses/{course_id}` - Получение информации о конкретном курсе
* `PUT /courses/{course_id}` - Обновление информации о курсе
* `DELETE /courses/{course_id}` - Удаление курса
* `POST /courses/enroll/{course_id}` - Запись на курс
* `GET /courses/enrolled/my` - Получение списка курсов, на которые записан пользователь
* `GET /courses/{course_id}/students` - Получение списка студентов курса

### Уроки (Lessons)

* `POST /lessons/` - Создание нового урока
* `GET /lessons/` - Получение списка уроков (с фильтрацией по курсу)
* `GET /lessons/{lesson_id}` - Получение информации о конкретном уроке
* `PUT /lessons/{lesson_id}` - Обновление информации об уроке
* `DELETE /lessons/{lesson_id}` - Удаление урока

### Комментарии (Comments)

* `POST /comments/` - Создание нового комментария
* `GET /comments/lesson/{lesson_id}` - Получение комментариев к уроку
* `GET /comments/{comment_id}` - Получение конкретного комментария
* `PUT /comments/{comment_id}` - Обновление комментария
* `DELETE /comments/{comment_id}` - Удаление комментария

### Оценки (Ratings)

* `POST /ratings/` - Создание или обновление оценки для урока
* `GET /ratings/lesson/{lesson_id}` - Получение всех оценок для урока
* `GET /ratings/lesson/{lesson_id}/average` - Получение средней оценки урока
* `GET /ratings/my` - Получение всех оценок текущего пользователя
* `DELETE /ratings/{rating_id}` - Удаление оценки

### Администрирование (Admin)

* `GET /admin/stats/courses` - Статистика по курсам
* `GET /admin/stats/users` - Статистика по пользователям
* `GET /admin/stats/popular-lessons` - Самые популярные уроки
* `GET /admin/stats/active-users` - Самые активные пользователи

## Тестирование

Для запуска тестов используйте:

```bash
pytest
```

## Примеры использования API

### Регистрация пользователя

```bash
curl -X 'POST' \
  'http://localhost:8000/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{
  "full_name": "Test User",
  "email": "test@example.com",
  "password": "password123"
}'
```

### Вход в систему (получение токена)

```bash
curl -X 'POST' \
  'http://localhost:8000/auth/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'username=test@example.com&password=password123'
```

### Создание курса

```bash
curl -X 'POST' \
  'http://localhost:8000/courses/' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
  "title": "Введение в Python",
  "description": "Базовый курс по Python для начинающих"
}'
```

## Лицензия

Этот проект распространяется под лицензией MIT.
