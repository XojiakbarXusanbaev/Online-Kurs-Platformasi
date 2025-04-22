## 📅 FastAPI asosidagi loyiha: "Online Kurs Platformasi"

### 🌟 Umumiy maqsad:
Foydalanuvchilar ro'yxatdan o'tib, onlayn kurslarga yozilishi, video darslarni ko'rishi va izoh qoldirishi mumkin bo'lgan platforma yaratish.

---

## 👥 Jamoalar va ularning vazifalari:

### 1-jamoa: **Foydalanuvchilar boshqaruvi (Auth & Users)**
- Ro'yxatdan o'tish (register)
- Kirish (login, JWT token)
- Profilni ko'rish va tahrirlash
- Admin uchun foydalanuvchilar ro'yxati

**Model:**
```python
class User(Base):
    id: int
    full_name: str
    email: str
    hashed_password: str
    is_active: bool
    is_admin: bool
```

### 2-jamoa: **Kurslar boshqaruvi**
- Kurslar CRUD
- Kursga yozilgan foydalanuvchilar
- Kurslar bo'yicha filter/search

**Model:**
```python
class Course(Base):
    id: int
    title: str
    description: str
    author_id: int  # FK to User
```

### 3-jamoa: **Video darslar (Lessons)**
- Darslar CRUD
- Darsga video va matn biriktirish
- O'quvchilar uchun ko'rish interfeysi

**Model:**
```python
class Lesson(Base):
    id: int
    course_id: int
    title: str
    video_url: str
    content: str
```

### 4-jamoa: **Izohlar va baholash**
- Darsga izoh qoldirish
- 1-5 yulduzli baholash
- O'rtacha reyting hisoblash

**Model:**
```python
class Comment(Base):
    id: int
    user_id: int
    lesson_id: int
    text: str
    created_at: datetime

class Rating(Base):
    id: int
    user_id: int
    lesson_id: int
    stars: int  # 1 to 5
```

### 5-jamoa: **Admin panel va statistika**
- Kurslar, foydalanuvchilar, darslar statistikasi
- Faollik monitoringi
- Eng ko'p ko'rilgan darslar

---

## 🚀 Texnologiyalar:
- FastAPI
- SQLAlchemy yoki Tortoise ORM
- PostgreSQL yoki SQLite
- Pydantic
- JWT autentifikatsiya

---

## ✅ Talablar:
- Swagger UI orqali hujjatlashtirish
- Pytest yordamida testlar
- Kod PEP8 ga mos yozilgan bo'lishi

---

## 📝 Har bir jamoa uchun `README.md` tavsiyasi:
- Loyiha haqida qisqacha
- Endpointlar ro'yxati
- Model strukturasi
- Ishga tushirish bo'yicha qo'llanma
- Test qoidalari

---

Agar kerak bo'lsa, PowerPoint slaydlar, arxitektura diagrammasi va Trello taqsimoti ham tayyorlab beriladi.

