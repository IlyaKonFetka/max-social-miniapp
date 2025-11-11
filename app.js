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
    userData: null
};

// ============= ИНИЦИАЛИЗАЦИЯ MAX BRIDGE =============

// Проверяем доступность MAX Bridge
if (typeof MaxBridge !== 'undefined') {
    console.log('✅ MAX Bridge доступен');
    
    // Инициализация при готовности
    MaxBridge.ready(() => {
        console.log('✅ MAX Bridge готов');
        AppState.isMaxReady = true;
        updateStatus('connected', 'Подключено к MAX');
        enableCallButton();
        
        // Получаем данные пользователя
        getUserData();
    });
} else {
    console.warn('⚠️ MAX Bridge недоступен - работа в режиме разработки');
    // Эмуляция для тестирования вне MAX
    setTimeout(() => {
        AppState.isMaxReady = true;
        updateStatus('connected', 'Режим разработки');
        enableCallButton();
    }, 1000);
}

// ============= ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ =============

function getUserData() {
    if (typeof MaxBridge !== 'undefined' && MaxBridge.getUserData) {
        MaxBridge.getUserData()
            .then(data => {
                AppState.userData = data;
                console.log('👤 Данные пользователя:', data);
            })
            .catch(err => {
                console.error('❌ Ошибка получения данных пользователя:', err);
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
        
        console.log('✅ Выбрано действие:', AppState.selectedAction);
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
    const icon = this.querySelector('.control-icon');
    const text = this.querySelector('.control-text');
    
    if (icon.textContent === '🔇') {
        icon.textContent = '🔊';
        text.textContent = 'Вкл. микрофон';
        console.log('🔇 Микрофон выключен');
    } else {
        icon.textContent = '🔇';
        text.textContent = 'Выкл. микрофон';
        console.log('🔊 Микрофон включен');
    }
});

// Кнопка чата
document.getElementById('toggleChatBtn').addEventListener('click', () => {
    alert('💬 Чат будет реализован в следующей версии');
    // TODO: Открыть чат интерфейс
});

// ============= ЛОГИКА ЗВОНКА =============

function startCallProcess() {
    console.log('📞 Начало процесса вызова...');
    
    // Показываем экран ожидания
    showScreen('waiting');
    
    // Отправляем уведомление боту через MAX Bridge
    sendCallRequestToBot();
    
    // Эмуляция поиска волонтёра (в реальности - через бота)
    setTimeout(() => {
        connectToVolunteer();
    }, 3000); // 3 секунды для демо
}

function sendCallRequestToBot() {
    if (typeof MaxBridge !== 'undefined' && MaxBridge.sendData) {
        MaxBridge.sendData({
            type: 'call_request',
            action: AppState.selectedAction,
            timestamp: Date.now()
        })
        .then(() => {
            console.log('✅ Запрос отправлен боту');
        })
        .catch(err => {
            console.error('❌ Ошибка отправки запроса:', err);
        });
    } else {
        console.log('📤 Эмуляция отправки запроса боту:', {
            type: 'call_request',
            action: AppState.selectedAction
        });
    }
}

function connectToVolunteer() {
    console.log('✅ Волонтёр найден!');
    
    // Показываем экран звонка
    showScreen('call');
    
    // Запускаем таймер звонка
    AppState.callStartTime = Date.now();
    startCallTimer();
    
    // Устанавливаем имя волонтёра (анонимное)
    document.getElementById('volunteerName').textContent = 'Волонтёр #' + Math.floor(Math.random() * 9999);
    
    AppState.isCallActive = true;
    
    // Уведомляем MAX о начале звонка
    if (typeof MaxBridge !== 'undefined' && MaxBridge.sendData) {
        MaxBridge.sendData({
            type: 'call_started',
            timestamp: Date.now()
        });
    }
}

function cancelCall() {
    console.log('❌ Вызов отменён');
    
    // Возвращаемся на главный экран
    showScreen('main');
    
    // Сбрасываем выбранное действие
    resetActionSelection();
}

function endCall() {
    console.log('📵 Звонок завершён');
    
    // Останавливаем таймер
    if (AppState.callTimerInterval) {
        clearInterval(AppState.callTimerInterval);
        AppState.callTimerInterval = null;
    }
    
    // Вычисляем длительность звонка
    const duration = Math.floor((Date.now() - AppState.callStartTime) / 1000);
    console.log(`⏱️ Длительность звонка: ${duration} сек`);
    
    // Уведомляем MAX о завершении звонка
    if (typeof MaxBridge !== 'undefined' && MaxBridge.sendData) {
        MaxBridge.sendData({
            type: 'call_ended',
            duration: duration,
            timestamp: Date.now()
        });
    }
    
    // Показываем благодарность
    showThankYouMessage();
    
    // Возвращаемся на главный экран
    setTimeout(() => {
        showScreen('main');
        resetActionSelection();
    }, 2000);
    
    AppState.isCallActive = false;
}

function showThankYouMessage() {
    const callContent = document.querySelector('.call-content');
    callContent.innerHTML = `
        <div style="text-align: center; padding: 32px;">
            <div style="font-size: 64px; margin-bottom: 16px;">✅</div>
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
console.log('📱 Мини-приложение загружено');
console.log('🔧 Режим:', typeof MaxBridge !== 'undefined' ? 'Продакшн (MAX)' : 'Разработка');

