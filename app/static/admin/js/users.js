// Функциональность управления пользователями
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем наличие токена
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/admin/login';
        return;
    }
    
    // Инициализация обработчиков кнопок редактирования и удаления
    setupButtonHandlers();
    
    // Настройка формы добавления пользователя
    setupUserForm();
    
    // Настройка поиска
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterTable(this.value);
        });
    }
    
    // Кнопка добавления пользователя
    const addUserBtn = document.querySelector('.btn-primary');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            // Очищаем форму
            document.getElementById('userForm').reset();
            // Показываем модальное окно
            showModal('userModal');
        });
    }
});

// Показать форму добавления пользователя
function showAddUserForm() {
    document.getElementById('addUserForm').classList.remove('hidden');
    // Сбросить форму
    document.getElementById('userForm').reset();
}

// Скрыть форму добавления пользователя
function hideAddUserForm() {
    document.getElementById('addUserForm').classList.add('hidden');
}

// Показать индикатор загрузки
function showLoading() {
    // Если на странице есть элемент loading-overlay, показываем его
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

// Скрыть индикатор загрузки
function hideLoading() {
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Показать уведомление
function showNotification(message, type = 'success') {
    // Создаем элемент уведомления, если его нет
    let notification = document.querySelector('.notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Устанавливаем текст и стиль
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Показываем уведомление
    notification.style.display = 'block';
    
    // Скрываем через 3 секунды
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Настройка формы пользователя
function setupUserForm() {
    const userForm = document.getElementById('user-form');
    if (!userForm) return;
    
    // Закрытие модального окна
    document.querySelectorAll('.modal-close, .modal-cancel').forEach(element => {
        element.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    userForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Получаем ID пользователя (если редактирование)
        const userId = document.getElementById('user-id').value;
        const isEdit = userId !== '';
        
        // Собираем данные формы
        const userData = {
            full_name: document.getElementById('full_name').value,
            email: document.getElementById('email').value,
            is_active: document.getElementById('is_active').value === 'true',
            is_admin: document.getElementById('is_admin').value === 'true'
        };
        
        // Добавляем пароль только если он не пустой
        const password = document.getElementById('password').value;
        if (password) {
            userData.password = password;
        }
        
        try {
            // Показываем индикатор загрузки
            showLoading();
            
            let url = '/api/admin/users';
            let method = 'POST';
            
            // Если это редактирование, меняем URL и метод
            if (isEdit) {
                url = `/api/admin/users/${userId}`;
                method = 'PUT';
            }
            
            // Отправляем запрос
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(userData)
            });
            
            // Скрываем индикатор загрузки
            hideLoading();
            
            if (response.ok) {
                // Показываем уведомление об успехе
                const message = isEdit ? 
                    'Foydalanuvchi muvaffaqiyatli yangilandi' : 
                    'Foydalanuvchi muvaffaqiyatli yaratildi';
                showNotification(message, 'success');
                
                // Скрываем модальное окно
                hideModal('user-modal');
                
                // Обновляем страницу через секунду
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                // Обрабатываем ошибку
                const error = await response.json();
                showNotification(error.detail || 'Xatolik yuz berdi', 'error');
            }
        } catch (error) {
            hideLoading();
            showNotification('Serverga ulanishda xatolik', 'error');
            console.error('Error saving user:', error);
        }
    });
}

// Настройка обработчиков кнопок
function setupButtonHandlers() {
    // Кнопки редактирования
    document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            editUser(userId);
        });
    });
    
    // Кнопки удаления
    document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-id');
            showDeleteConfirmation(userId);
        });
    });
}

// Показать модальное окно
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Скрыть модальное окно
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Фильтрация таблицы
function filterTable(query) {
    const table = document.getElementById('usersTable');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    const searchTerm = query.toLowerCase();
    
    rows.forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();
        const email = row.cells[2].textContent.toLowerCase();
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Редактирование пользователя
async function editUser(userId) {
    try {
        // Показываем индикатор загрузки
        showLoading();
        
        // Получаем данные пользователя
        const response = await fetch(`/api/admin/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        // Скрываем индикатор загрузки
        hideLoading();
        
        if (response.ok) {
            const userData = await response.json();
            
            // Заполняем форму данными пользователя
            document.getElementById('user-id').value = userId;
            document.getElementById('full_name').value = userData.full_name;
            document.getElementById('email').value = userData.email;
            document.getElementById('password').value = ''; // Пустой пароль - не меняем пароль
            document.getElementById('is_admin').value = userData.is_admin.toString();
            document.getElementById('is_active').value = userData.is_active.toString();
            
            // Меняем заголовок модального окна
            document.getElementById('modal-title').textContent = 'Foydalanuvchini tahrirlash';
            
            // Показываем модальное окно
            showModal('user-modal');
        } else {
            // Обрабатываем ошибку
            const error = await response.json();
            showNotification(error.detail || 'Foydalanuvchi ma\'lumotlarini olishda xatolik', 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Serverga ulanishda xatolik', 'error');
        console.error('Error fetching user:', error);
    }
}

// Показать подтверждение удаления
function showDeleteConfirmation(userId) {
    // Сохраняем ID пользователя для удаления
    document.getElementById('confirm-delete').setAttribute('data-id', userId);
    
    // Показываем модальное окно подтверждения
    showModal('confirm-modal');
    
    // Настраиваем обработчик для кнопки подтверждения
    document.getElementById('confirm-delete').onclick = function() {
        deleteUser(userId);
    };
}

// Удаление пользователя
async function deleteUser(userId) {
    try {
        // Показываем индикатор загрузки
        showLoading();
        
        // Отправляем запрос на удаление
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        // Скрываем индикатор загрузки
        hideLoading();
        
        if (response.ok) {
            showNotification('Foydalanuvchi muvaffaqiyatli o\'chirildi', 'success');
            
            // Скрываем модальное окно
            hideModal('confirm-modal');
            
            // Обновляем страницу через секунду
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            // Обрабатываем ошибку
            const error = await response.json();
            showNotification(error.detail || 'Foydalanuvchini o\'chirishda xatolik', 'error');
        }
    } catch (error) {
        hideLoading();
        showNotification('Serverga ulanishda xatolik', 'error');
        console.error('Error deleting user:', error);
    }
}

// Переход на определенную страницу пагинации
function goToPage(page) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', page);
    window.location.href = url.toString();
}
