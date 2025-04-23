from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
import os

from app.database import engine, Base
from app.routers import users, auth, courses, lessons, comments, ratings, admin
from app.routers import admin_ui

# Создание таблиц в базе данных
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Online Kurs Platformasi",
    description="Foydalanuvchilar ro'yxatdan o'tib, onlayn kurslarga yozilishi, video darslarni ko'rishi va izoh qoldirishi mumkin bo'lgan platforma",
    version="1.0.0"
)

# Настройка упрощенной авторизации для Swagger UI
app.swagger_ui_init_oauth = {
    "usePkceWithAuthorizationCodeGrant": False,
    "useBasicAuthenticationWithAccessCodeGrant": False
}

# Упрощенная схема авторизации для Swagger UI
from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    # Добавляем схему Bearer авторизации
    openapi_schema["components"] = openapi_schema.get("components", {})
    openapi_schema["components"]["securitySchemes"] = {
        "Bearer": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Монтирование статических файлов
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Подключение роутеров API
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(courses.router, prefix="/api", tags=["Courses"])
app.include_router(lessons.router, prefix="/api", tags=["Lessons"])
app.include_router(comments.router, prefix="/api", tags=["Comments"])
app.include_router(ratings.router, prefix="/api", tags=["Ratings"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin API"])

# Подключение маршрутов для административного интерфейса
app.include_router(admin_ui.router)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to Online Kurs Platformasi API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
