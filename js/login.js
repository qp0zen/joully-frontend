document.addEventListener('DOMContentLoaded', () => {
    // Заменяем старый IP на новый безопасный адрес
    const SERVER_URL = 'https://api.joully.ru';
  
    const authContainer = document.getElementById('authContainer');
    const loginSection = document.getElementById('loginSection');
    const registerSection = document.getElementById('registerSection');
    const toRegisterBtn = document.getElementById('toRegisterBtn');
    const toLoginBtn = document.getElementById('toLoginBtn');
  
    // Анимация переключения Вход / Регистрация внутри карточки
    if (toRegisterBtn) {
      toRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.style.opacity = '0';
        loginSection.style.transform = 'scale(0.95)';
        setTimeout(() => {
          loginSection.classList.add('hidden');
          registerSection.classList.remove('hidden');
          setTimeout(() => {
            registerSection.style.opacity = '1';
            registerSection.style.transform = 'scale(1)';
          }, 20);
        }, 250);
      });
    }
  
    if (toLoginBtn) {
      toLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.style.opacity = '0';
        registerSection.style.transform = 'scale(0.95)';
        setTimeout(() => {
          registerSection.classList.add('hidden');
          loginSection.classList.remove('hidden');
          setTimeout(() => {
            loginSection.style.opacity = '1';
            loginSection.style.transform = 'scale(1)';
          }, 20);
        }, 250);
      });
    }
  
    // ЗАПРОС НА АВТОРИЗАЦИЮ (LOGIN)
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailOrPhone = document.getElementById('email').value;
      const password = document.getElementById('password').value;
  
      try {
        const response = await fetch(`${SERVER_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email_or_phone: emailOrPhone, password: password })
        });
  
        const data = await response.json();
  
        if (response.ok) {
          // Плавно гасим карточку перед редиректом
          authContainer.style.transition = 'opacity 0.25s, transform 0.25s';
          authContainer.style.opacity = '0';
          authContainer.style.transform = 'scale(0.9)';
          
          // Сохраняем имя юзера, чтобы chat.html мог его прочитать
          localStorage.setItem('joully_username', data.user.username);
          localStorage.setItem('joully_is_active', data.user.is_active); // <--- ДОБАВИЛИ ЭТУ СТРОКУ
  
          setTimeout(() => {
            window.location.href = 'chat.html'; // ПЕРЕХОД НА ОТДЕЛЬНЫЙ ФАЙЛ С ЧАТОМ
          }, 250);
        } else {
          alert(`Ошибка: ${data.detail}`);
        }
      } catch (error) {
        alert('Ошибка соединения с Python сервером.');
      }
    });
  
    // ЗАПРОС НА РЕГИСТРАЦИЮ (REGISTER)
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('reg-email').value;
      const username = document.getElementById('reg-username').value;
      const password = document.getElementById('reg-password').value;
  
      try {
        const response = await fetch(`${SERVER_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, username: username, password: password })
        });
  
        const data = await response.json();
  
        if (response.ok) {
          if (toLoginBtn) toLoginBtn.click();
          registerForm.reset();
        } else {
          alert(`Ошибка регистрации: ${data.detail}`);
        }
      } catch (error) {
        alert('Ошибка соединения с Python сервером.');
      }
    });
  });
  
