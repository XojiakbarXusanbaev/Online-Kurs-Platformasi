document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Скрыть предыдущие ошибки
        errorMessage.classList.remove('show');
        
        try {
            console.log('Отправка запроса на /api/auth/token');
            const response = await fetch('/api/auth/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
            });
            
            const data = await response.json();
            console.log('Ответ сервера:', response.status);
            
            if (response.ok) {
                console.log('Авторизация успешна, токен:', data.access_token);
                
                // Сохраняем токен и для cookie, и для localStorage
                const token = data.access_token;
                
                // Правильно устанавливаем cookie с необходимыми параметрами
                document.cookie = `access_token=${token}; path=/; SameSite=Strict; max-age=${60*60*24}`; // 24 часа
                localStorage.setItem('token', token); // Для JavaScript
                
                console.log('Токен сохранен в cookie:', document.cookie);
                console.log('Токен сохранен в localStorage:', localStorage.getItem('token'));
                
                // Проверяем что токен установлен корректно перед редиректом
                if (token) {
                    // Сначала отправляем запрос с токеном, чтобы сервер установил cookie на своей стороне
                    fetch('/admin/dashboard-redirect', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => {
                        if (response.ok) {
                            // Теперь переходим на дашборд
                            console.log('Токен успешно сохранен, переходим на дашборд');
                            window.location.href = '/admin/dashboard';
                        } else {
                            console.error('Ошибка при редиректе:', response.status);
                            errorMessage.textContent = 'Ошибка при редиректе';
                            errorMessage.classList.add('show');
                        }
                    })
                    .catch(error => {
                        console.error('Ошибка при редиректе:', error);
                        errorMessage.textContent = 'Ошибка при отправке запроса';
                        errorMessage.classList.add('show');
                    });
                } else {
                    errorMessage.textContent = 'Ошибка: не получен токен доступа';
                    errorMessage.classList.add('show');
                }
            } else {
                // Показать сообщение об ошибке
                errorMessage.textContent = data.detail || 'Ошибка авторизации';
                errorMessage.classList.add('show');
                console.error('Ошибка авторизации:', data);
            }
        } catch (error) {
            console.error('Ошибка при выполнении запроса:', error);
            errorMessage.textContent = 'Ошибка при отправке запроса';
            errorMessage.classList.add('show');
        }
    });
});

// Проверка наличия токена при загрузке страницы
const savedToken = localStorage.getItem('token');
if (savedToken) {
    console.log('Токен найден в localStorage:', savedToken);
    // Проверяем cookie
    console.log('Cookies:', document.cookie);
    
    // Убедимся, что токен установлен в cookie
    if (!document.cookie.includes('access_token')) {
        console.log('Устанавливаем токен в cookie из localStorage');
        document.cookie = `access_token=${savedToken}; path=/; max-age=${60*60*24}`;
    }
    
    // Если токен уже есть, перенаправить на дашборд
    // Делаем это только если мы на странице логина
    if (window.location.pathname.includes('/admin/login')) {
        console.log('Перенаправление на дашборд...');
        window.location.href = '/admin/dashboard';
    }
}
