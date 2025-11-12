/**
 * MAX Мини-приложение: Помощь слабовидящим
 * Хакатон 573
 */

// Глобальное состояние приложения
const AppState = {
    isMaxReady: false,
    isCallActive: false,
    selectedAction: null,
    callStartTime: null,
    callTimerInterval: null,
    userData: null,
    apiBaseUrl: null,
    currentRequestId: null,
    currentSessionId: null
};

// ============= ИНИЦИАЛИЗАЦИЯ =============

// Загрузка конфигурации API
async function loadConfig() {
    try {
        const response = await fetch('./config.json');
        const config = await response.json();
        AppState.apiBaseUrl = config.apiBaseUrl;
        console.log('API URL загружен:', AppState.apiBaseUrl);
        
        // Проверка доступности API
        await checkApiHealth();
    } catch (error) {
        console.error('Ошибка загрузки конфига:', error);
        updateStatus('error', 'Ошибка подключения к API');
    }
}

// Проверка здоровья API
async function checkApiHealth() {
    try {
        const response = await fetch(`${AppState.apiBaseUrl}/health`);
        const data = await response.json();
        console.log('API здоровье:', data);
        updateStatus('connected', 'API подключен');
    } catch (error) {
        console.error('API недоступен:', error);
        updateStatus('error', 'API недоступен');
    }
}

// Инициализация при загрузке страницы
loadConfig().then(() => {
    // Проверяем доступность MAX Bridge
    if (typeof MaxBridge !== 'undefined') {
        console.log('MAX Bridge доступен');
        
        // Инициализация при готовности
        MaxBridge.ready(() => {
            console.log('MAX Bridge готов');
            AppState.isMaxReady = true;
            updateStatus('connected', 'Подключено к MAX');
            enableCallButton();
            
            // Получаем данные пользователя
            getUserData();
        });
    } else {
        console.warn('MAX Bridge недоступен - работа в режиме разработки');
        // Эмуляция для тестирования вне MAX
        setTimeout(() => {
            AppState.isMaxReady = true;
            updateStatus('connected', 'Режим разработки');
            enableCallButton();
        }, 1000);
    }
});

// ============= ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ =============

function getUserData() {
    if (typeof MaxBridge !== 'undefined' && MaxBridge.getUserData) {
        MaxBridge.getUserData()
            .then(data => {
                AppState.userData = data;
                console.log('Данные пользователя:', data);
            })
            .catch(err => {
                console.error('Ошибка получения данных пользователя:', err);
            });
    }
}

// ============= УПРАВЛЕНИЕ СТАТУСОМ =============

function updateStatus(type, message) {
    const indicator = document.getElementById('statusIndicator');
    const dot = indicator.querySelector('.status-dot');
    const text = document.getElementById('statusText');
    
    text.textContent = message;
    
    if (type === 'connected') {
        dot.classList.add('connected');
    } else {
        dot.classList.remove('connected');
    }
}

function enableCallButton() {
    const callBtn = document.getElementById('callBtn');
    callBtn.disabled = false;
}

// ============= ОБРАБОТЧИКИ СОБЫТИЙ =============

// Основная кнопка вызова
document.getElementById('callBtn').addEventListener('click', () => {
    if (!AppState.selectedAction) {
        // Если не выбрано действие, прокручиваем к выбору
        document.querySelector('.quick-actions').scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
        
        // Подсвечиваем карточки действий
        const cards = document.querySelectorAll('.action-card');
        cards.forEach(card => {
            card.style.animation = 'pulse 0.5s';
            setTimeout(() => {
                card.style.animation = '';
            }, 500);
        });
        
        return;
    }
    
    startCallProcess();
});

// Карточки быстрых действий
document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', function() {
        // Убираем выделение со всех карточек
        document.querySelectorAll('.action-card').forEach(c => {
            c.classList.remove('selected');
        });
        
        // Выделяем выбранную
        this.classList.add('selected');
        
        // Сохраняем выбранное действие
        AppState.selectedAction = this.dataset.action;
        
        // Обновляем текст кнопки
        const actionText = this.querySelector('.action-text').textContent;
        document.querySelector('.btn-text').textContent = `Позвать: ${actionText}`;
        
        console.log('Выбрано действие:', AppState.selectedAction);
    });
});

// Кнопка отмены ожидания
document.getElementById('cancelWaitBtn').addEventListener('click', () => {
    cancelCall();
});

// Кнопка завершения звонка
document.getElementById('endCallBtn').addEventListener('click', () => {
    endCall();
});

// Кнопка отключения микрофона
document.getElementById('muteBtn').addEventListener('click', function() {
    const text = this.querySelector('.control-text');
    
    if (text.textContent === 'Выкл. микрофон') {
        text.textContent = 'Вкл. микрофон';
        console.log('Микрофон выключен');
    } else {
        text.textContent = 'Выкл. микрофон';
        console.log('Микрофон включен');
    }
});

// Кнопка чата
document.getElementById('toggleChatBtn').addEventListener('click', () => {
    alert('Чат будет реализован в следующей версии');
    // TODO: Открыть чат интерфейс
});

// ============= ЛОГИКА ЗВОНКА =============

function startCallProcess() {
    console.log('Начало процесса вызова...');
    
    // Показываем экран ожидания
    showScreen('waiting');
    
    // Отправляем уведомление боту через MAX Bridge
    sendCallRequestToBot();
    
    // Эмуляция поиска волонтёра (в реальности - через бота)
    setTimeout(() => {
        connectToVolunteer();
    }, 3000); // 3 секунды для демо
}

async function sendCallRequestToBot() {
    try {
        // Получаем user_id из MAX или используем тестовый
        const userId = AppState.userData?.user_id || Math.floor(Math.random() * 100000);
        
        // Отправляем запрос к API
        const response = await fetch(`${AppState.apiBaseUrl}/api/call-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                action_type: AppState.selectedAction
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        AppState.currentRequestId = data.id;
        console.log('Запрос создан:', data);
        
        // Также отправляем через MAX Bridge если доступен
        if (typeof MaxBridge !== 'undefined' && MaxBridge.sendData) {
            MaxBridge.sendData({
                type: 'call_request',
                action: AppState.selectedAction,
                request_id: data.id,
                timestamp: Date.now()
            });
        }
        
    } catch (error) {
        console.error('Ошибка отправки запроса:', error);
        alert('Ошибка создания запроса. Проверьте подключение к API.');
    }
}

async function connectToVolunteer() {
    console.log('Волонтёр найден!');
    
    try {
        // Получаем доступного волонтёра
        const volunteersResponse = await fetch(`${AppState.apiBaseUrl}/api/volunteers/available`);
        const volunteers = await volunteersResponse.json();
        
        if (volunteers.length === 0) {
            alert('К сожалению, сейчас нет доступных волонтёров. Попробуйте позже.');
            showScreen('main');
            return;
        }
        
        const volunteer = volunteers[0];
        
        // Создаём сессию звонка
        const sessionResponse = await fetch(`${AppState.apiBaseUrl}/api/call-sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                request_id: AppState.currentRequestId,
                volunteer_id: volunteer.id
            })
        });
        
        if (!sessionResponse.ok) {
            throw new Error('Ошибка создания сессии');
        }
        
        const session = await sessionResponse.json();
        AppState.currentSessionId = session.id;
        
        // Показываем экран звонка
        showScreen('call');
        
        // Запускаем таймер звонка
        AppState.callStartTime = Date.now();
        startCallTimer();
        
        // Устанавливаем имя волонтёра
        document.getElementById('volunteerName').textContent = volunteer.name || `Волонтёр #${volunteer.id}`;
        
        AppState.isCallActive = true;
        
        console.log('Сессия создана:', session);
        
        // Уведомляем MAX о начале звонка
        if (typeof MaxBridge !== 'undefined' && MaxBridge.sendData) {
            MaxBridge.sendData({
                type: 'call_started',
                session_id: session.id,
                volunteer_id: volunteer.id,
                timestamp: Date.now()
            });
        }
        
    } catch (error) {
        console.error('Ошибка подключения к волонтёру:', error);
        alert('Ошибка подключения к волонтёру. Попробуйте снова.');
        showScreen('main');
        resetActionSelection();
    }
}

async function cancelCall() {
    console.log('Вызов отменён');
    
    try {
        // Отменяем запрос на сервере
        if (AppState.currentRequestId) {
            await fetch(`${AppState.apiBaseUrl}/api/call-requests/${AppState.currentRequestId}/cancel`, {
                method: 'PUT'
            });
            console.log('Запрос отменён на сервере');
        }
    } catch (error) {
        console.error('Ошибка отмены запроса:', error);
    }
    
    // Возвращаемся на главный экран
    showScreen('main');
    
    // Сбрасываем выбранное действие
    resetActionSelection();
    AppState.currentRequestId = null;
}

async function endCall() {
    console.log('Звонок завершён');
    
    // Останавливаем таймер
    if (AppState.callTimerInterval) {
        clearInterval(AppState.callTimerInterval);
        AppState.callTimerInterval = null;
    }
    
    // Вычисляем длительность звонка
    const duration = Math.floor((Date.now() - AppState.callStartTime) / 1000);
    console.log(`Длительность звонка: ${duration} сек`);
    
    try {
        // Завершаем сессию на сервере
        if (AppState.currentSessionId) {
            const response = await fetch(`${AppState.apiBaseUrl}/api/call-sessions/${AppState.currentSessionId}/end`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    duration: duration,
                    rating: 5 // По умолчанию 5, можно добавить интерфейс для оценки
                })
            });
            
            if (response.ok) {
                const session = await response.json();
                console.log('Сессия завершена:', session);
            }
        }
    } catch (error) {
        console.error('Ошибка завершения сессии:', error);
    }
    
    // Уведомляем MAX о завершении звонка
    if (typeof MaxBridge !== 'undefined' && MaxBridge.sendData) {
        MaxBridge.sendData({
            type: 'call_ended',
            duration: duration,
            session_id: AppState.currentSessionId,
            timestamp: Date.now()
        });
    }
    
    // Показываем благодарность
    showThankYouMessage();
    
    // Возвращаемся на главный экран
    setTimeout(() => {
        showScreen('main');
        resetActionSelection();
        AppState.currentRequestId = null;
        AppState.currentSessionId = null;
    }, 2000);
    
    AppState.isCallActive = false;
}

function showThankYouMessage() {
    const callContent = document.querySelector('.call-content');
    callContent.innerHTML = `
        <div style="text-align: center; padding: 32px;">
            <h2 style="font-size: 28px; margin-bottom: 12px;">Спасибо!</h2>
            <p style="font-size: 18px; opacity: 0.9;">Надеемся, мы смогли помочь</p>
        </div>
    `;
}

// ============= ТАЙМЕР ЗВОНКА =============

function startCallTimer() {
    const timerElement = document.getElementById('callTimer');
    
    AppState.callTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - AppState.callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        timerElement.textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

// ============= УПРАВЛЕНИЕ ЭКРАНАМИ =============

function showScreen(screenName) {
    // Скрываем все экраны
    document.getElementById('mainScreen').classList.add('hidden');
    document.getElementById('waitingScreen').classList.add('hidden');
    document.getElementById('callScreen').classList.add('hidden');
    
    // Показываем нужный экран
    switch(screenName) {
        case 'main':
            document.getElementById('mainScreen').classList.remove('hidden');
            break;
        case 'waiting':
            document.getElementById('waitingScreen').classList.remove('hidden');
            break;
        case 'call':
            document.getElementById('callScreen').classList.remove('hidden');
            break;
    }
}

function resetActionSelection() {
    // Сбрасываем выбор действия
    AppState.selectedAction = null;
    
    // Убираем выделение с карточек
    document.querySelectorAll('.action-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Возвращаем исходный текст кнопки
    document.querySelector('.btn-text').textContent = 'Позвать волонтёра';
}

// ============= УТИЛИТЫ =============

// Обработка закрытия приложения
window.addEventListener('beforeunload', () => {
    if (AppState.isCallActive) {
        // Уведомляем о незавершённом звонке
        if (typeof MaxBridge !== 'undefined' && MaxBridge.sendData) {
            MaxBridge.sendData({
                type: 'call_interrupted',
                timestamp: Date.now()
            });
        }
    }
});

// Логирование для отладки
console.log('Мини-приложение загружено');
console.log('Режим:', typeof MaxBridge !== 'undefined' ? 'Продакшн (MAX)' : 'Разработка');

