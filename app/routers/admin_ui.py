from fastapi import APIRouter, Request, Depends, HTTPException, status, Cookie
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from sqlalchemy import func
from jose import JWTError, jwt
from datetime import datetime, timedelta

from app import models, schemas
from app.database import get_db
from app.security import get_current_admin_user, security_scheme, SECRET_KEY, ALGORITHM
from app import models

# Создание маршрутизатора для административного интерфейса
router = APIRouter(prefix="/admin", tags=["Admin UI"])

# Указываем директорию с шаблонами
templates = Jinja2Templates(directory="app/templates")

@router.get("/", response_class=RedirectResponse)
async def admin_root():
    """Перенаправление с корневого пути админ-панели на страницу входа"""
    return RedirectResponse("/admin/login")

@router.get("/debug", response_class=HTMLResponse)
async def admin_debug(request: Request):
    """Отладочная страница для проверки работы шаблонов"""
    return templates.TemplateResponse("admin/debug.html", {"request": request})

@router.get("/login", response_class=HTMLResponse)
async def admin_login(request: Request):
    """Страница входа в административную панель"""
    return templates.TemplateResponse("admin/login.html", {"request": request})

@router.post("/auth-check")
async def admin_auth_check(request: Request, db: Session = Depends(get_db), credentials = Depends(security_scheme)):
    """Проверка аутентификации для администратора"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Недействительный токен"})
        
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user or not user.is_admin:
            return JSONResponse(status_code=status.HTTP_403_FORBIDDEN, content={"detail": "Недостаточно прав для доступа"})
            
        return {"email": user.email, "full_name": user.full_name, "is_admin": user.is_admin}
    except jwt.PyJWTError:
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Недействительный токен"})

@router.post("/dashboard-redirect")
async def admin_dashboard_redirect(request: Request, db: Session = Depends(get_db)):
    """Перенаправление на дашборд с токеном"""
    print("[ИНФО] Получен запрос на dashboard-redirect")
    try:
        # Получаем токен из заголовка Authorization
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            print("[ОШИБКА] Отсутствует заголовок Authorization или неверный формат: {auth_header}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header is missing or invalid")

        token = auth_header.split(" ")[1]
        print(f"[ИНФО] Получен токен: {token[:10]}...")
        
        # Проверяем валидность токена
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                print("[ОШИБКА] Email не найден в токене")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
                
            # Проверяем пользователя в базе данных
            user = db.query(models.User).filter(models.User.email == email).first()
            if not user:
                print(f"[ОШИБКА] Пользователь с email {email} не найден")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found") 
            
            if not user.is_admin:
                print(f"[ОШИБКА] Пользователь {email} не является администратором")
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
                
            print(f"[ИНФО] Валидация токена успешна для пользователя {email}")
            
            # Сохраняем токен в cookie
            response = JSONResponse(content={"status": "ok", "message": "Успешная авторизация"})
            response.set_cookie(
                key="access_token", 
                value=token, 
                httponly=True, 
                path="/",
                max_age=24*60*60, # 24 часа
                samesite="lax" # Важно для современных браузеров
            )
            
            print(f"[ИНФО] Токен успешно установлен в cookie")
            return response
            
        except JWTError as e:
            print(f"[ОШИБКА] JWT ошибка: {str(e)}")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token format")            
    except Exception as e:
        print(f"[ОШИБКА] Неожиданная ошибка: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Unexpected error: {str(e)}")

# Обработка токена и аутентификации
def get_token_from_cookie(access_token: Optional[str] = Cookie(None)):
    """Получаем токен из cookie"""
    if access_token is None:
        print("[ОШИБКА] Токен не найден в cookie")
        return None
    
    print(f"[ИНФО] Токен получен из cookie: {access_token[:10]}...")
    return access_token

# Функция проверки пользователя по токену
async def get_current_admin_user_from_token(token: str, db: Session):
    """Проверяем токен и получаем пользователя с правами админа"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            print("[ОШИБКА] Email не найден в токене")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print(f"[ОШИБКА] Пользователь с email {email} не найден")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        if not user.is_admin:
            print(f"[ОШИБКА] Пользователь {email} не является администратором")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        
        print(f"[ИНФО] Успешная аутентификация пользователя {email}")
        return user
    except JWTError as e:
        print(f"[ОШИБКА] JWT ошибка: {str(e)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

@router.get("/dashboard", response_class=HTMLResponse)
async def admin_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_token_from_cookie)
):
    """Главная страница административной панели"""
    # Если токен отсутствует, перенаправляем на страницу входа
    if token is None:
        print("[ИНФО] Токен отсутствует, перенаправление на страницу входа")
        return RedirectResponse("/admin/login", status_code=status.HTTP_303_SEE_OTHER)
    
    print(f"[ИНФО] Попытка доступа к дашборду, токен: {token[:10]}...")
    try:
        # Проверяем токен и получаем пользователя
        user = await get_current_admin_user_from_token(token, db)
        
        # Получение статистики
        users_count = db.query(func.count(models.User.id)).scalar()
        courses_count = db.query(func.count(models.Course.id)).scalar()
        lessons_count = db.query(func.count(models.Lesson.id)).scalar()
        enrollments_count = db.query(func.count(models.Enrollment.id)).scalar()
        
        # Последние 5 пользователей
        recent_users = db.query(models.User).order_by(models.User.id.desc()).limit(5).all()
        
        # Популярные курсы (по количеству записей)
        popular_courses = db.query(models.Course).join(models.Enrollment).group_by(models.Course.id)\
            .order_by(func.count(models.Enrollment.id).desc()).limit(5).all()
        
        # Добавление дополнительных данных к курсам
        for course in popular_courses:
            # Количество студентов
            course.students_count = db.query(func.count(models.Enrollment.id))\
                .filter(models.Enrollment.course_id == course.id).scalar()
            
            # Средний рейтинг
            avg_rating = db.query(func.avg(models.Rating.stars))\
                .join(models.Lesson, models.Lesson.id == models.Rating.lesson_id)\
                .filter(models.Lesson.course_id == course.id).scalar()
            course.average_rating = round(avg_rating, 1) if avg_rating else 0
        
        return templates.TemplateResponse("admin/dashboard.html", {
            "request": request,
            "stats": {
                "users_count": users_count,
                "courses_count": courses_count,
                "lessons_count": lessons_count,
                "enrollments_count": enrollments_count
            },
            "recent_users": recent_users,
            "popular_courses": popular_courses,
            "current_user": user
        })
    except JWTError:
        # Возвращаем на страницу входа
        response = RedirectResponse("/admin/login")
        response.delete_cookie("access_token")
        return response

@router.get("/users", response_class=HTMLResponse)
async def admin_users(
    request: Request,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_token_from_cookie)
):
    # Если токен отсутствует, перенаправляем на страницу входа
    if token is None:
        return RedirectResponse("/admin/login", status_code=status.HTTP_303_SEE_OTHER)
    """Фойдаланувчиларни бошқариш саҳифаси"""
    try:
        # Проверяем токен и получаем пользователя
        user = await get_current_admin_user_from_token(token, db)
        
        # Пагинация
        offset = (page - 1) * limit
        
        # Фойдаланувчиларни олиш
        users = db.query(models.User).offset(offset).limit(limit).all()
        
        # Умумий фойдаланувчилар сони
        total = db.query(func.count(models.User.id)).scalar()
        pages = (total + limit - 1) // limit  # Юқорига тўғрилаш
        
        return templates.TemplateResponse("admin/users.html", {
            "request": request,
            "users": users,
            "total": total,
            "pages": pages,
            "current_page": page,
            "current_user": user
        })
    except JWTError:
        # Кириш саҳифасига қайтариш
        response = RedirectResponse("/admin/login")
        response.delete_cookie("access_token")
        return response

@router.get("/courses", response_class=HTMLResponse)
async def admin_courses(
    request: Request,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_token_from_cookie)
):
    # Если токен отсутствует, перенаправляем на страницу входа
    if token is None:
        return RedirectResponse("/admin/login", status_code=status.HTTP_303_SEE_OTHER)
    try:
        # Проверяем токен и получаем пользователя
        user = await get_current_admin_user_from_token(token, db)
        
        # Пагинация
        offset = (page - 1) * limit
        
        # Получение курсов с пагинацией
        courses_query = db.query(models.Course).offset(offset).limit(limit).all()
        
        # Общее количество курсов для пагинации
        total_courses = db.query(func.count(models.Course.id)).scalar()
        total_pages = (total_courses + limit - 1) // limit  # Округление вверх
        
        # Получение дополнительных данных для каждого курса
        courses = []
        for course in courses_query:
            # Количество уроков
            lessons_count = db.query(func.count(models.Lesson.id)).filter(
                models.Lesson.course_id == course.id
            ).scalar()
            
            # Количество студентов
            students_count = db.query(func.count(models.Enrollment.id)).filter(
                models.Enrollment.course_id == course.id
            ).scalar()
            
            # Средний рейтинг
            avg_rating = db.query(func.avg(models.Rating.stars)).join(
                models.Lesson, models.Rating.lesson_id == models.Lesson.id
            ).filter(
                models.Lesson.course_id == course.id
            ).scalar()
            
            # Получение информации об авторе
            author = db.query(models.User).filter(models.User.id == course.author_id).first()
            
            courses.append({
                "id": course.id,
                "title": course.title,
                "author": author,
                "lessons_count": lessons_count,
                "students_count": students_count,
                "average_rating": round(float(avg_rating), 1) if avg_rating else 0
            })
        
        # Получение всех авторов для выпадающего списка формы добавления курса
        authors = db.query(models.User).all()
        
        return templates.TemplateResponse("admin/courses.html", {
            "request": request,
            "courses": courses,
            "authors": authors,
            "total": total_courses,
            "pages": total_pages,
            "current_page": page,
            "current_user": user
        })
    except JWTError:
        # Возвращаем на страницу входа
        response = RedirectResponse("/admin/login")
        response.delete_cookie("access_token")
        return response

@router.get("/lessons", response_class=HTMLResponse)
async def admin_lessons(
    request: Request,
    course_id: Optional[int] = None,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_token_from_cookie)
):
    # Если токен отсутствует, перенаправляем на страницу входа
    if token is None:
        return RedirectResponse("/admin/login", status_code=status.HTTP_303_SEE_OTHER)
    """Урокларни бошқариш саҳифаси"""
    try:
        # Проверяем токен и получаем пользователя
        user = await get_current_admin_user_from_token(token, db)
            
        # Пагинация
        offset = (page - 1) * limit
        
        # Базовый запрос
        lessons_query = db.query(models.Lesson)
        
        # Если указан ID курса, фильтруем по нему
        if course_id:
            lessons_query = lessons_query.filter(models.Lesson.course_id == course_id)
        
        # Применяем пагинацию
        lessons_db = lessons_query.offset(offset).limit(limit).all()
        
        # Общее количество уроков для пагинации
        total_lessons_query = db.query(func.count(models.Lesson.id))
        if course_id:
            total_lessons_query = total_lessons_query.filter(models.Lesson.course_id == course_id)
        total_lessons = total_lessons_query.scalar()
        total_pages = (total_lessons + limit - 1) // limit  # Округление вверх
        
        # Получение дополнительных данных для каждого урока
        lessons = []
        for lesson in lessons_db:
            # Получение курса
            course = db.query(models.Course).filter(models.Course.id == lesson.course_id).first()
            
            # Средний рейтинг урока
            avg_rating = db.query(func.avg(models.Rating.stars)).filter(models.Rating.lesson_id == lesson.id).scalar()
            
            # Количество комментариев к уроку
            comments_count = db.query(models.Comment).filter(models.Comment.lesson_id == lesson.id).count()
            
            lessons.append({
                "id": lesson.id,
                "title": lesson.title,
                "content": lesson.content,
                "video_url": lesson.video_url,
                "course": course,
                "average_rating": round(float(avg_rating), 1) if avg_rating else None,
                "comments_count": comments_count
            })
        
        # Получение всех курсов для выпадающего списка
        courses = db.query(models.Course).all()
        
        return templates.TemplateResponse("admin/lessons.html", {
            "request": request,
            "lessons": lessons,
            "courses": courses,
            "selected_course": course_id,
            "current_page": page,
            "total_pages": total_pages,
            "pages": total_pages,
            "total": total_lessons,
            "current_user": user
        })
    except JWTError:
        # Возвращаем на страницу входа
        response = RedirectResponse("/admin/login")
        response.delete_cookie("access_token")
        return response

@router.get("/comments", response_class=HTMLResponse)
async def admin_comments(
    request: Request,
    lesson_id: Optional[int] = None,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_token_from_cookie)
):
    # Если токен отсутствует, перенаправляем на страницу входа
    if token is None:
        return RedirectResponse("/admin/login", status_code=status.HTTP_303_SEE_OTHER)
    try:
        # Проверяем токен и получаем пользователя
        user = await get_current_admin_user_from_token(token, db)
        
        # Пагинация
        offset = (page - 1) * limit
        
        # Базовый запрос
        comments_query = db.query(models.Comment)
        
        # Если указан ID урока, фильтруем по нему
        if lesson_id:
            comments_query = comments_query.filter(models.Comment.lesson_id == lesson_id)
        
        # Применяем пагинацию и сортировку по дате создания (сначала новые)
        comments_db = comments_query.order_by(models.Comment.created_at.desc()).offset(offset).limit(limit).all()
        
        # Общее количество комментариев для пагинации
        total_comments_query = db.query(func.count(models.Comment.id))
        if lesson_id:
            total_comments_query = total_comments_query.filter(models.Comment.lesson_id == lesson_id)
        total_comments = total_comments_query.scalar()
        total_pages = (total_comments + limit - 1) // limit  # Округление вверх
        
        # Получение дополнительных данных для каждого комментария
        comments = []
        for comment in comments_db:
            # Получение пользователя
            user = db.query(models.User).filter(models.User.id == comment.user_id).first()
            
            # Получение урока
            lesson = db.query(models.Lesson).filter(models.Lesson.id == comment.lesson_id).first()
            
            comments.append({
                "id": comment.id,
                "text": comment.text,
                "created_at": comment.created_at,
                "user": user,
                "lesson": lesson
            })
        
        # Получение всех уроков для выпадающего списка
        lessons_db = db.query(models.Lesson).all()
        lessons = []
        for lesson in lessons_db:
            course = db.query(models.Course).filter(models.Course.id == lesson.course_id).first()
            lessons.append({
                "id": lesson.id,
                "title": lesson.title,
                "course": course
            })
        
        return templates.TemplateResponse("admin/comments.html", {
            "request": request,
            "comments": comments,
            "lessons": lessons,
            "selected_lesson": lesson_id,
            "total_pages": total_pages,
            "current_page": page,
            "current_page": page,
            "pages": total_pages,
            "total": total_comments,
            "current_user": user
        })
    except JWTError:
        # Возвращаем на страницу входа
        response = RedirectResponse("/admin/login")
        response.delete_cookie("access_token")
        return response

@router.get("/ratings", response_class=HTMLResponse)
async def admin_ratings(
    request: Request,
    lesson_id: Optional[int] = None,
    stars: Optional[int] = None,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_token_from_cookie)
):
    # Если токен отсутствует, перенаправляем на страницу входа
    if token is None:
        return RedirectResponse("/admin/login", status_code=status.HTTP_303_SEE_OTHER)
    try:
        # Проверяем токен и получаем пользователя
        user = await get_current_admin_user_from_token(token, db)
        
        # Пагинация
        offset = (page - 1) * limit
        
        # Базовый запрос
        ratings_query = db.query(models.Rating)
        
        # Применяем фильтры
        if lesson_id:
            ratings_query = ratings_query.filter(models.Rating.lesson_id == lesson_id)
        if stars:
            ratings_query = ratings_query.filter(models.Rating.stars == stars)
        
        # Применяем пагинацию
        ratings_db = ratings_query.offset(offset).limit(limit).all()
        
        # Общее количество рейтингов для пагинации
        total_ratings_query = db.query(func.count(models.Rating.id))
        if lesson_id:
            total_ratings_query = total_ratings_query.filter(models.Rating.lesson_id == lesson_id)
        if stars:
            total_ratings_query = total_ratings_query.filter(models.Rating.stars == stars)
        total_ratings = total_ratings_query.scalar()
        total_pages = (total_ratings + limit - 1) // limit  # Округление вверх
        
        # Получение дополнительных данных для каждого рейтинга
        ratings = []
        for rating in ratings_db:
            # Получение пользователя
            user = db.query(models.User).filter(models.User.id == rating.user_id).first()
            
            # Получение урока
            lesson = db.query(models.Lesson).filter(models.Lesson.id == rating.lesson_id).first()
            
            # Получение курса
            course = None
            if lesson:
                course = db.query(models.Course).filter(models.Course.id == lesson.course_id).first()
            
            ratings.append({
                "id": rating.id,
                "stars": rating.stars,
                "user": user,
                "lesson": lesson,
                "lesson_course": course
            })
        
        # Получение всех уроков для выпадающего списка
        lessons_db = db.query(models.Lesson).all()
        lessons = []
        for lesson in lessons_db:
            course = db.query(models.Course).filter(models.Course.id == lesson.course_id).first()
            lessons.append({
                "id": lesson.id,
                "title": lesson.title,
                "course": course
            })
        
        return templates.TemplateResponse("admin/ratings.html", {
            "request": request,
            "ratings": ratings,
            "lessons": lessons,
            "stars_options": list(range(1, 6)),
            "selected_lesson": lesson_id,
            "selected_stars": stars,
            "total_pages": total_pages,
            "current_page": page,
            "current_page": page,
            "pages": total_pages,
            "total": total_ratings,
            "current_user": user
        })
    except JWTError:
        # Возвращаем на страницу входа
        response = RedirectResponse("/admin/login")
        response.delete_cookie("access_token")
        return response

@router.get("/enrollments", response_class=HTMLResponse)
async def admin_enrollments(
    request: Request,
    course_id: Optional[int] = None,
    user_id: Optional[int] = None,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_token_from_cookie)
):
    # Если токен отсутствует, перенаправляем на страницу входа
    if token is None:
        return RedirectResponse("/admin/login", status_code=status.HTTP_303_SEE_OTHER)
    try:
        # Проверяем токен и получаем пользователя
        user = await get_current_admin_user_from_token(token, db)
        
        # Пагинация
        offset = (page - 1) * limit
        
        # Базовый запрос
        enrollments_query = db.query(models.Enrollment)
        
        # Применяем фильтры
        if course_id:
            enrollments_query = enrollments_query.filter(models.Enrollment.course_id == course_id)
        if user_id:
            enrollments_query = enrollments_query.filter(models.Enrollment.user_id == user_id)
        
        # Применяем пагинацию и сортировку по дате записи (сначала новые)
        enrollments_db = enrollments_query.order_by(models.Enrollment.enrolled_at.desc()).offset(offset).limit(limit).all()
        
        # Общее количество записей для пагинации
        total_enrollments_query = db.query(func.count(models.Enrollment.id))
        if course_id:
            total_enrollments_query = total_enrollments_query.filter(models.Enrollment.course_id == course_id)
        if user_id:
            total_enrollments_query = total_enrollments_query.filter(models.Enrollment.user_id == user_id)
        total_enrollments = total_enrollments_query.scalar()
        total_pages = (total_enrollments + limit - 1) // limit  # Округление вверх
        
        # Получение дополнительных данных для каждой записи
        enrollments = []
        for enrollment in enrollments_db:
            # Получение пользователя
            user = db.query(models.User).filter(models.User.id == enrollment.user_id).first()
            
            # Получение курса
            course = db.query(models.Course).filter(models.Course.id == enrollment.course_id).first()
            
            enrollments.append({
                "id": enrollment.id,
                "enrolled_at": enrollment.enrolled_at,
                "user": user,
                "course": course
            })
        
        # Получение всех курсов и пользователей для выпадающих списков
        courses = db.query(models.Course).all()
        users = db.query(models.User).all()
        
        return templates.TemplateResponse("admin/enrollments.html", {
            "request": request,
            "enrollments": enrollments,
            "courses": courses,
            "users": users,
            "selected_course": course_id,
            "total_pages": total_pages,
            "current_page": page,
            "selected_user": user_id,
            "current_page": page,
            "pages": total_pages,
            "total": total_enrollments,
            "current_user": user
        })
    except JWTError:
        # Возвращаем на страницу входа
        response = RedirectResponse("/admin/login")
        response.delete_cookie("access_token")
        return response

@router.get("/db-schema", response_class=HTMLResponse)
async def admin_db_schema(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_token_from_cookie)
):
    # Если токен отсутствует, перенаправляем на страницу входа
    if token is None:
        return RedirectResponse("/admin/login", status_code=status.HTTP_303_SEE_OTHER)
    try:
        # Проверяем токен и получаем пользователя
        user = await get_current_admin_user_from_token(token, db)
            
        return templates.TemplateResponse("admin/db_schema.html", {
            "request": request,
            "current_user": user
        })
    except JWTError:
        # Возвращаем на страницу входа
        response = RedirectResponse("/admin/login")
        response.delete_cookie("access_token")
        return response
