// Проверка наличия токена при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверка токена (кроме страницы логина)
    if (!window.location.pathname.includes('/login')) {
        const token = localStorage.getItem('token');
        if (!token) {
            // Если токена нет, перенаправляем на страницу входа
            window.location.href = '/admin/login';
            return;
        }
        
        // Добавляем токен к каждому запросу
        setupTokenInterceptor();
    }
    
    // Настройка кнопки выхода
    setupLogout();
});

// Добавляем токен к каждому запросу через Fetch API
function setupTokenInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        // Получаем токен из localStorage
        const token = localStorage.getItem('token');
        
        // Если токен есть, добавляем его в заголовки
        if (token) {
            options.headers = options.headers || {};
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Выполняем оригинальный запрос
        const response = await originalFetch(url, options);
        
        // Обрабатываем ошибки авторизации
        if (response.status === 401) {
            // Если получаем 401 Unauthorized, удаляем токен и перенаправляем на страницу входа
            localStorage.removeItem('token');
            window.location.href = '/admin/login';
        }
        
        return response;
    };
}

// Настройка кнопки выхода
function setupLogout() {
    const userInfo = document.querySelector('.user-info');
    if (userInfo) {
        // Добавляем выпадающее меню для пользователя
        const dropdown = document.createElement('div');
        dropdown.className = 'user-dropdown';
        dropdown.innerHTML = `
            <ul>
                <li><a href="#" id="logoutBtn">Выйти</a></li>
            </ul>
        `;
        userInfo.appendChild(dropdown);
        
        // Обработчик клика на пользователя (показать/скрыть меню)
        userInfo.addEventListener('click', function(e) {
            dropdown.classList.toggle('show');
            e.stopPropagation();
        });
        
        // Скрыть меню при клике в другом месте
        document.addEventListener('click', function() {
            dropdown.classList.remove('show');
        });
        
        // Обработчик кнопки выхода
        document.getElementById('logoutBtn').addEventListener('click', function(e) {
            e.preventDefault();
            // Удаляем токен и перенаправляем на страницу входа
            localStorage.removeItem('token');
            window.location.href = '/admin/login';
        });
    }
}

// Общая функция для отображения уведомлений
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Показываем уведомление
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Скрываем и удаляем через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Общая функция для подтверждения действия
function confirmAction(message, callback) {
    const confirmed = window.confirm(message);
    if (confirmed) {
        callback();
    }
}

// Общая функция для обработки ошибок API
function handleApiError(error) {
    console.error('API Error:', error);
    let errorMessage = 'Произошла ошибка при выполнении запроса';
    
    if (error.response && error.response.data) {
        errorMessage = error.response.data.detail || errorMessage;
    }
    
    showNotification(errorMessage, 'error');
}

// Функция для форматирования даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Утилита для фильтрации таблиц
function filterTable(tableId, searchInputId, columnIndex) {
    const searchInput = document.getElementById(searchInputId);
    const table = document.getElementById(tableId);
    const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
    
    searchInput.addEventListener('keyup', function() {
        const query = this.value.toLowerCase();
        
        for (let i = 0; i < rows.length; i++) {
            const cell = rows[i].getElementsByTagName('td')[columnIndex];
            
            if (cell) {
                const text = cell.textContent || cell.innerText;
                if (text.toLowerCase().indexOf(query) > -1) {
                    rows[i].style.display = '';
                } else {
                    rows[i].style.display = 'none';
                }
            }
        }
    });
}
