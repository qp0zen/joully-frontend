document.addEventListener('DOMContentLoaded', async () => {
    // Используем защищенный поддомен, который вы только что создали
    const SERVER_URL = 'https://api.joully.ru'; 
    const WS_URL = 'wss://api.joully.ru/ws'; // wss:// — это безопасный веб-сокет (SSL)
  
    const messageForm = document.getElementById('messageForm');
    const messageInput = document.getElementById('messageInput');
    const messagesViewport = document.getElementById('messagesViewport');
    const searchBarInput = document.getElementById('searchBarInput');
    const searchResults = document.getElementById('searchResults');
    const chatsListContainer = document.getElementById('chatsListContainer');
  
    const currentUsername = localStorage.getItem('joully_username') || 'Гость';
    let activeReceiver = 'joully_bot'; 
  
    const userProfileName = document.getElementById('userProfileName');
    const userProfileAvatar = document.getElementById('userProfileAvatar');
    const userProfileAbout = document.getElementById('userProfileAbout');
  
    const settingsModal = document.getElementById('settingsModal');
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const avatarInput = document.getElementById('avatarInput');
    const modalAvatarPreview = document.getElementById('modalAvatarPreview');
    const aboutInput = document.getElementById('aboutInput');
  
    let selectedAvatarFile = null;
    let cachedAvatarBg = 'none';
    let socket = null; // Переменная под вебсокет
  
    // ==========================================
    // ИНИЦИАЛИЗАЦИЯ ЖИВОГО СОЕДИНЕНИЯ WEBSOCKET
    // ==========================================
    function initWebSocket() {
      if (currentUsername === 'Гость') return;
  
      socket = new WebSocket(`${WS_URL}/${currentUsername}`);
  
      // Слушаем входящие сообщения от сервера в реальном времени
      socket.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        
        // Если пришедшее сообщение принадлежит текущему открытому чату
        if ((msg.sender === activeReceiver && msg.receiver === currentUsername) || 
            (msg.sender === currentUsername && msg.receiver === activeReceiver) ||
            (msg.sender === 'joully_bot' && activeReceiver === 'joully_bot')) {
          
          // Быстро перерисовываем историю, чтобы отобразить новое сообщение
          await displayChatHistory();
          
          // Если бот подтвердил верификацию, запрашиваем обновление профиля
          if (msg.text.includes("успешно верифицирован")) {
            await loadUserProfile();
          }
        }
      };
  
      socket.onclose = () => {
        console.log("Соединение закрыто. Попытка переподключения...");
        setTimeout(initWebSocket, 3000); // Реконнект при обрыве
      };
    }
      // ==========================================
  // 1. ЗАГРУЗКА И ИСТОРИЯ СООБЩЕНИЙ С УЧЕТОМ Receiver
  // ==========================================
  async function displayChatHistory() {
    try {
      const response = await fetch(`${SERVER_URL}/get-messages?sender=${currentUsername}&receiver=${activeReceiver}`);
      if (response.ok) {
        const messages = await response.json();
        messagesViewport.innerHTML = ''; 

        messages.forEach(msg => {
          let messageHtml = '';
          
          if (msg.sender === 'joully_bot') {
            messageHtml = `
              <div class="chat-message">
                <div class="msg-avatar-area"><img src="images/logo.png" alt="Joully" class="msg-avatar"></div>
                <div class="msg-body">
                  <div class="msg-meta">
                    <span class="msg-author bot">Joully Bot</span>
                    <span class="msg-bot-tag">БОТ</span>
                    <span class="msg-time">Сегодня в ${msg.timestamp}</span>
                  </div>
                  <div class="msg-text">${msg.text}</div>
                </div>
              </div>
            `;
          } else if (msg.sender === currentUsername) {
            let myAvatarHtml = `<div class="msg-avatar" style="background-color: #5865f2; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:14px; border-radius:50%; text-transform:uppercase;">${currentUsername.substring(0,2)}</div>`;
            if (cachedAvatarBg && cachedAvatarBg !== 'none') {
              myAvatarHtml = `<div class="msg-avatar" style="background-image: ${cachedAvatarBg}; background-size: cover; background-position: center; border-radius:50%; width:40px; height:40px;"></div>`;
            }
            messageHtml = `
              <div class="chat-message">
                <div class="msg-avatar-area">${myAvatarHtml}</div>
                <div class="msg-body">
                  <div class="msg-meta">
                    <span class="msg-author" style="color: #4ccd79;">${currentUsername}</span>
                    <span class="msg-time">Сегодня в ${msg.timestamp}</span>
                  </div>
                  <div class="msg-text">${msg.text}</div>
                </div>
              </div>
            `;
          } else {
            messageHtml = `
              <div class="chat-message">
                <div class="msg-avatar-area">
                  <div class="msg-avatar" style="background-color: #e4aa34; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:14px; border-radius:50%; text-transform:uppercase;">${msg.sender.substring(0,2)}</div>
                </div>
                <div class="msg-body">
                  <div class="msg-meta">
                    <span class="msg-author" style="color: #40a0ff;">${msg.sender}</span>
                    <span class="msg-time">Сегодня в ${msg.timestamp}</span>
                  </div>
                  <div class="msg-text">${msg.text}</div>
                </div>
              </div>
            `;
          }
          messagesViewport.insertAdjacentHTML('beforeend', messageHtml);
        });
        messagesViewport.scrollTop = messagesViewport.scrollHeight;
      }
    } catch (err) { console.error(err); }
  }

  // ==========================================
  // 2. ЖИВОЙ ПОИСК ПОЛЬЗОВАТЕЛЕЙ ПО БАЗЕ
  // ==========================================
  searchBarInput.addEventListener('input', async () => {
    const query = searchBarInput.value.trim();
    if (query.length < 1) {
      searchResults.classList.add('hidden');
      return;
    }
    try {
      const response = await fetch(`${SERVER_URL}/search-users?query=${query}&current_user=${currentUsername}`);
      if (response.ok) {
        const users = await response.json();
        if (users.length === 0) {
          searchResults.innerHTML = '<div style="color:#949ba4; font-size:12px; padding:6px;">Ничего не найдено</div>';
        } else {
          searchResults.innerHTML = '';
          users.forEach(user => {
            let avatarStyle = user.avatar_url ? `background-image: url('${SERVER_URL}${user.avatar_url}')` : '';
            let avatarText = user.avatar_url ? '' : user.username.substring(0,2);
            searchResults.insertAdjacentHTML('beforeend', `
              <div class="search-result-user" data-username="${user.username}" data-avatar="${user.avatar_url || ''}">
                <div class="search-avatar" style="${avatarStyle}">${avatarText}</div>
                <span class="search-name">${user.username}</span>
              </div>
            `);
          });
        }
        searchResults.classList.remove('hidden');
      }
    } catch (e) { console.error(e); }
  });

  searchResults.addEventListener('click', (e) => {
    const row = e.target.closest('.search-result-user');
    if (!row) return;
    const selectedUser = row.dataset.username;
    const avatarUrl = row.dataset.avatar;
    searchResults.classList.add('hidden');
    searchBarInput.value = '';

    let existingItem = chatsListContainer.querySelector(`[data-receiver="${selectedUser}"]`);
    if (!existingItem) {
      let avatarStyle = avatarUrl ? `background-image: url('${SERVER_URL}${avatarUrl}'); background-size:cover;` : '';
      let avatarText = avatarUrl ? '' : selectedUser.substring(0,2);
      chatsListContainer.insertAdjacentHTML('beforeend', `
        <div class="channel-item" data-receiver="${selectedUser}">
          <div class="bot-avatar-wrapper">
            <div class="bot-avatar" style="${avatarStyle} display:flex; align-items:center; justify-content:center; color:white; font-size:12px; font-weight:bold; text-transform:uppercase;">${avatarText}</div>
            <span class="status-online"></span>
          </div>
          <div class="channel-info">
            <div class="channel-name-row"><span class="channel-name">${selectedUser}</span></div>
            <span class="channel-preview">Нажмите, чтобы открыть чат</span>
          </div>
        </div>
      `);
    }
    chatsListContainer.querySelector(`[data-receiver="${selectedUser}"]`).click();
  });

  chatsListContainer.addEventListener('click', async (e) => {
    const item = e.target.closest('.channel-item');
    if (!item) return;
    chatsListContainer.querySelectorAll('.channel-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    activeReceiver = item.dataset.receiver;
    
    const topbarTitle = document.querySelector('.topbar-user h4');
    const topbarBadge = document.querySelector('.topbar-user .bot-badge');
    const messageInputBox = document.getElementById('messageInput');

    if (activeReceiver === 'joully_bot') {
      topbarTitle.textContent = 'Joully Bot';
      topbarBadge.style.display = 'inline-block';
      messageInputBox.placeholder = 'Написать в #Joully Bot';
    } else {
      topbarTitle.textContent = activeReceiver;
      topbarBadge.style.display = 'none';
      messageInputBox.placeholder = `Написать пользователю @${activeReceiver}`;
    }
    await displayChatHistory();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar-search')) {
      searchResults.classList.add('hidden');
    }
  });
    // ==========================================
  // 3. ОТПРАВКА СООБЩЕНИЯ ЧЕРЕЗ WEBSOCKET
  // ==========================================
  if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = messageInput.value.trim();
      if (!text) return;
      messageInput.value = '';

      // Вместо старого fetch отправляем сообщение в открытый вебсокет
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          sender: currentUsername,
          receiver: activeReceiver,
          text: text
        }));

        // Сразу локально перерендериваем чат, чтобы мгновенно увидеть своё сообщение
        await displayChatHistory();
      } else {
        alert("Ошибка: нет стабильного соединения с сервером чата. Попробуйте обновить страницу.");
      }
    });
  }

  // Вспомогательный хелпер для симуляции json.stringify на фронтенде
  const json = { stringify: (obj) => JSON.stringify(obj) };

  // ==========================================
  // 4. УПРАВЛЕНИЕ ПРОФИЛЕМ ПОЛЬЗОВАТЕЛЯ
  // ==========================================
  async function loadUserProfile() {
    try {
      const response = await fetch(`${SERVER_URL}/get-profile?username=${currentUsername}`);
      if (response.ok) {
        const data = await response.json();
        
        // Актуализируем статус верификации
        localStorage.setItem('joully_is_active', data.is_active);
        
        if (userProfileName) userProfileName.textContent = currentUsername;
        if (userProfileAbout) userProfileAbout.textContent = data.about || '#0001';
        if (aboutInput) aboutInput.value = data.about || '';
        
        if (data.avatar_url) {
          const fullAvatarUrl = `${SERVER_URL}${data.avatar_url}?t=${Date.now()}`;
          userProfileAvatar.textContent = '';
          userProfileAvatar.style.backgroundImage = `url('${fullAvatarUrl}')`;
          userProfileAvatar.style.backgroundSize = 'cover';
          cachedAvatarBg = `url('${fullAvatarUrl}')`;
          
          modalAvatarPreview.textContent = '';
          modalAvatarPreview.style.backgroundImage = `url('${fullAvatarUrl}')`;
        } else {
          userProfileAvatar.textContent = currentUsername.substring(0, 2);
          userProfileAvatar.style.backgroundImage = 'none';
          cachedAvatarBg = 'none';
          
          modalAvatarPreview.textContent = currentUsername.substring(0, 2);
          modalAvatarPreview.style.backgroundImage = 'none';
        }
      }
    } catch (e) { 
      console.error("Ошибка при получении профиля:", e); 
    }
  }

  // Первичный запуск функций при входе в чат
  await loadUserProfile();
  await displayChatHistory();
  initWebSocket(); // Запускаем WebSocket-соединение!

  // Открытие/закрытие модалки настроек
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.remove('modal-hidden');
    });
  }
  
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('modal-hidden');
      selectedAvatarFile = null;
    });
  }

  // Локальное превью выбранной аватарки в модалке
  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0]; // Исправили на взятие первого файла из массива
      if (file) {
        selectedAvatarFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          modalAvatarPreview.textContent = '';
          modalAvatarPreview.style.backgroundImage = `url('${event.target.result}')`;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Кнопка сохранения настроек
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      const formData = new FormData();
      formData.append('username', currentUsername);
      formData.append('about', aboutInput.value.trim());
      if (selectedAvatarFile) {
        formData.append('avatar', selectedAvatarFile);
      }
      
      try {
        const response = await fetch(`${SERVER_URL}/update-profile`, { 
          method: 'POST', 
          body: formData 
        });
        
        if (response.ok) {
          settingsModal.classList.add('modal-hidden');
          await loadUserProfile();
          await displayChatHistory(); // Перерисовываем чат с новыми аватарками
        } else {
          alert('Не удалось сохранить настройки');
        }
      } catch (err) { 
        alert('Ошибка соединения с сервером при обновлении профиля'); 
      }
    });
  }

  // Кнопка выхода из аккаунта (очистка сессии)
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }
});
