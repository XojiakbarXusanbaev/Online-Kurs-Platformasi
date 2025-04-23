// Функциональность управления уроками
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация фильтра для поиска уроков
    filterTable('lessonsTable', 'lessonSearch', 1); // Поиск по названию (колонка с индексом 1)
    
    // Настройка формы добавления урока
    setupLessonForm();
});

// Показать форму добавления урока
function showAddLessonForm() {
    document.getElementById('addLessonForm').classList.remove('hidden');
    // Сбросить форму
    document.getElementById('lessonForm').reset();
}

// Скрыть форму добавления урока
function hideAddLessonForm() {
    document.getElementById('addLessonForm').classList.add('hidden');
}

// Фильтрация уроков по курсу
function filterLessons() {
    const courseFilter = document.getElementById('courseFilter');
    const courseId = courseFilter.value;
    
    // Если выбран конкретный курс, добавляем параметр в URL
    if (courseId) {
        const url = new URL(window.location.href);
        url.searchParams.set('course_id', courseId);
        window.location.href = url.toString();
    } else {
        // Если выбраны все курсы, удаляем параметр из URL
        const url = new URL(window.location.href);
        url.searchParams.delete('course_id');
        window.location.href = url.toString();
    }
}

// Настройка формы урока (добавление/редактирование)
function setupLessonForm() {
    const lessonForm = document.getElementById('lessonForm');
    
    lessonForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Собираем данные формы
        const formData = new FormData(lessonForm);
        const lessonData = {
            title: formData.get('title'),
            course_id: parseInt(formData.get('course_id')),
            video_url: formData.get('video_url'),
            content: formData.get('content'),
            order: parseInt(formData.get('order'))
        };
        
        try {
            // Отправляем запрос на создание нового урока
            const response = await fetch('/api/admin/lessons', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(lessonData)
            });
            
            if (response.ok) {
                showNotification('Урок успешно создан');
                // Скрыть форму
                hideAddLessonForm();
                // Обновить страницу для отображения нового урока
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                const errorData = await response.json();
                showNotification(errorData.detail || 'Ошибка при создании урока', 'error');
            }
        } catch (error) {
            handleApiError(error);
        }
    });
}

// Редактирование урока
async function editLesson(lessonId) {
    try {
        // Получаем данные урока
        const response = await fetch(`/api/admin/lessons/${lessonId}`);
        if (response.ok) {
            const lessonData = await response.json();
            
            // Заполняем форму данными урока
            document.getElementById('title').value = lessonData.title;
            document.getElementById('course').value = lessonData.course_id;
            document.getElementById('videoUrl').value = lessonData.video_url;
            document.getElementById('content').value = lessonData.content;
            document.getElementById('order').value = lessonData.order;
            
            // Модифицируем форму для обновления урока
            const lessonForm = document.getElementById('lessonForm');
            
            // Сохраняем оригинальный обработчик submit
            const originalSubmitHandler = lessonForm.onsubmit;
            
            // Заменяем обработчик на новый для обновления
            lessonForm.onsubmit = async function(e) {
                e.preventDefault();
                
                // Собираем данные формы
                const formData = new FormData(lessonForm);
                const updatedLessonData = {
                    title: formData.get('title'),
                    course_id: parseInt(formData.get('course_id')),
                    video_url: formData.get('video_url'),
                    content: formData.get('content'),
                    order: parseInt(formData.get('order'))
                };
                
                try {
                    // Отправляем запрос на обновление урока
                    const updateResponse = await fetch(`/api/admin/lessons/${lessonId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updatedLessonData)
                    });
                    
                    if (updateResponse.ok) {
                        showNotification('Урок успешно обновлен');
                        // Скрыть форму
                        hideAddLessonForm();
                        // Обновить страницу
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        const errorData = await updateResponse.json();
                        showNotification(errorData.detail || 'Ошибка при обновлении урока', 'error');
                    }
                } catch (error) {
                    handleApiError(error);
                }
                
                // Восстанавливаем оригинальный обработчик
                lessonForm.onsubmit = originalSubmitHandler;
            };
            
            // Изменяем заголовок формы
            document.querySelector('#addLessonForm .form-title').textContent = 'Редактировать урок';
            
            // Показываем форму
            document.getElementById('addLessonForm').classList.remove('hidden');
        } else {
            const errorData = await response.json();
            showNotification(errorData.detail || 'Ошибка при получении данных урока', 'error');
        }
    } catch (error) {
        handleApiError(error);
    }
}

// Просмотр урока (с комментариями и рейтингами)
function viewLesson(lessonId) {
    window.location.href = `/admin/lesson-details/${lessonId}`;
}

// Удаление урока
function deleteLesson(lessonId) {
    confirmAction('Вы уверены, что хотите удалить этот урок? Это действие также удалит все связанные комментарии и рейтинги.', async function() {
        try {
            const response = await fetch(`/api/admin/lessons/${lessonId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('Урок успешно удален');
                // Обновить страницу
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                const errorData = await response.json();
                showNotification(errorData.detail || 'Ошибка при удалении урока', 'error');
            }
        } catch (error) {
            handleApiError(error);
        }
    });
}

// Переход на определенную страницу пагинации
function goToPage(page) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', page);
    window.location.href = url.toString();
}
