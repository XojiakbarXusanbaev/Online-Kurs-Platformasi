// Функциональность управления курсами
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация фильтра для поиска курсов
    filterTable('coursesTable', 'courseSearch', 1); // Поиск по названию (колонка с индексом 1)
    
    // Настройка формы добавления курса
    setupCourseForm();
});

// Показать форму добавления курса
function showAddCourseForm() {
    document.getElementById('addCourseForm').classList.remove('hidden');
    // Сбросить форму
    document.getElementById('courseForm').reset();
}

// Скрыть форму добавления курса
function hideAddCourseForm() {
    document.getElementById('addCourseForm').classList.add('hidden');
}

// Настройка формы курса (добавление/редактирование)
function setupCourseForm() {
    const courseForm = document.getElementById('courseForm');
    
    courseForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Собираем данные формы
        const formData = new FormData(courseForm);
        const courseData = {
            title: formData.get('title'),
            description: formData.get('description'),
            author_id: parseInt(formData.get('author_id'))
        };
        
        try {
            // Отправляем запрос на создание нового курса
            const response = await fetch('/api/admin/courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(courseData)
            });
            
            if (response.ok) {
                showNotification('Курс успешно создан');
                // Скрыть форму
                hideAddCourseForm();
                // Обновить страницу для отображения нового курса
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                const errorData = await response.json();
                showNotification(errorData.detail || 'Ошибка при создании курса', 'error');
            }
        } catch (error) {
            handleApiError(error);
        }
    });
}

// Редактирование курса
async function editCourse(courseId) {
    try {
        // Получаем данные курса
        const response = await fetch(`/api/admin/courses/${courseId}`);
        if (response.ok) {
            const courseData = await response.json();
            
            // Заполняем форму данными курса
            document.getElementById('title').value = courseData.title;
            document.getElementById('description').value = courseData.description;
            document.getElementById('author').value = courseData.author_id;
            
            // Модифицируем форму для обновления курса
            const courseForm = document.getElementById('courseForm');
            
            // Сохраняем оригинальный обработчик submit
            const originalSubmitHandler = courseForm.onsubmit;
            
            // Заменяем обработчик на новый для обновления
            courseForm.onsubmit = async function(e) {
                e.preventDefault();
                
                // Собираем данные формы
                const formData = new FormData(courseForm);
                const updatedCourseData = {
                    title: formData.get('title'),
                    description: formData.get('description'),
                    author_id: parseInt(formData.get('author_id'))
                };
                
                try {
                    // Отправляем запрос на обновление курса
                    const updateResponse = await fetch(`/api/admin/courses/${courseId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updatedCourseData)
                    });
                    
                    if (updateResponse.ok) {
                        showNotification('Курс успешно обновлен');
                        // Скрыть форму
                        hideAddCourseForm();
                        // Обновить страницу
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        const errorData = await updateResponse.json();
                        showNotification(errorData.detail || 'Ошибка при обновлении курса', 'error');
                    }
                } catch (error) {
                    handleApiError(error);
                }
                
                // Восстанавливаем оригинальный обработчик
                courseForm.onsubmit = originalSubmitHandler;
            };
            
            // Изменяем заголовок формы
            document.querySelector('#addCourseForm .form-title').textContent = 'Редактировать курс';
            
            // Показываем форму
            document.getElementById('addCourseForm').classList.remove('hidden');
        } else {
            const errorData = await response.json();
            showNotification(errorData.detail || 'Ошибка при получении данных курса', 'error');
        }
    } catch (error) {
        handleApiError(error);
    }
}

// Удаление курса
function deleteCourse(courseId) {
    confirmAction('Вы уверены, что хотите удалить этот курс? Это действие также удалит все связанные уроки.', async function() {
        try {
            const response = await fetch(`/api/admin/courses/${courseId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showNotification('Курс успешно удален');
                // Обновить страницу
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                const errorData = await response.json();
                showNotification(errorData.detail || 'Ошибка при удалении курса', 'error');
            }
        } catch (error) {
            handleApiError(error);
        }
    });
}

// Переход к просмотру уроков курса
function viewLessons(courseId) {
    window.location.href = `/admin/lessons?course_id=${courseId}`;
}

// Переход на определенную страницу пагинации
function goToPage(page) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', page);
    window.location.href = url.toString();
}
