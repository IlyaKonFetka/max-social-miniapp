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
    currentSessionId: null,
    // WebRTC
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    isMuted: false,
    isCameraOff: false,
    isDevelopment: typeof MaxBridge === 'undefined',
    signalingUrl: null,
    roomId: null,
    role: 'user'
};

const SignalingState = {
    socket: null,
    isReady: false,
    reconnectTimeout: null,
    messageQueue: [],
    shouldReconnect: false
};

const RTC_CONFIGURATION = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

const MEDIA_CONSTRAINTS = {
    audio: true,
    video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 }
    }
};

// ============= ИНИЦИАЛИЗАЦИЯ =============

// Извлечение параметров из URL
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        user_id: params.get('user_id'),
        room_id: params.get('room_id'),
        role: params.get('role')
    };
}

// Загрузка конфигурации API
async function loadConfig() {
    try {
        const response = await fetch('./config.json');
        const config = await response.json();
        AppState.apiBaseUrl = config.apiBaseUrl;
        AppState.signalingUrl = config.signalingUrl;
        console.log('API URL загружен:', AppState.apiBaseUrl);
        console.log('Signaling URL загружен:', AppState.signalingUrl);
        
        // Получаем параметры из URL
        const urlParams = getUrlParams();
        if (urlParams.user_id) {
            console.log('User ID из URL:', urlParams.user_id);
            AppState.userData = { user_id: urlParams.user_id };
            
            // Отображаем параметры в интерфейсе
            document.getElementById('userIdValue').textContent = urlParams.user_id;
        }
        if (urlParams.room_id) {
            console.log('Room ID из URL:', urlParams.room_id);
            AppState.roomId = urlParams.room_id;
            document.getElementById('roomIdValue').textContent = urlParams.room_id;
        }
        if (urlParams.role) {
            console.log('Role из URL:', urlParams.role);
            AppState.role = urlParams.role;
            document.getElementById('roleValue').textContent = urlParams.role;
        }
        
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
        const response = await fetch(`${AppState.apiBaseUrl}/health`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
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
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
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
        const volunteersResponse = await fetch(`${AppState.apiBaseUrl}/api/volunteers/available`, {
            headers: {
                'ngrok-skip-browser-warning': 'true'
            }
        });
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
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
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
        AppState.roomId = `session-${session.id}`;
        
        // Показываем экран звонка
        showScreen('call');
        
        // Запускаем таймер звонка
        AppState.callStartTime = Date.now();
        startCallTimer();
        
        // Устанавливаем имя волонтёра
        document.getElementById('volunteerName').textContent = volunteer.name || `Волонтёр #${volunteer.id}`;
        
        AppState.isCallActive = true;
        
        console.log('Сессия создана:', session);
        
        // Инициализируем медиа-потоки
        const mediaSuccess = await initMediaStreams();
        if (!mediaSuccess) {
            console.error('Не удалось получить медиа-поток');
            return;
        }
        
        // Подключаемся к signaling серверу и начинаем звонок
        if (AppState.signalingUrl) {
            try {
                await connectSignaling(AppState.signalingUrl, AppState.roomId);
                // Небольшая задержка перед началом звонка
                setTimeout(() => {
                    startCall().catch(err => console.error('Ошибка startCall:', err));
                }, 500);
            } catch (error) {
                console.error('Ошибка WebRTC:', error);
                if (AppState.isDevelopment) {
                    updateDevStatus('Не удалось подключиться к signaling серверу');
                }
            }
        } else {
            console.warn('Signaling URL не задан - WebRTC звонки недоступны');
        }
        
        // Уведомляем MAX о начале звонка
        if (typeof MaxBridge !== 'undefined' && MaxBridge.sendData) {
            MaxBridge.sendData({
                type: 'call_started',
                session_id: session.id,
                volunteer_id: volunteer.id,
                room_id: AppState.roomId,
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
                method: 'PUT',
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
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
    
    // Останавливаем медиа-потоки и WebRTC
    stopMediaStreams();
    
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
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
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
        AppState.roomId = null;
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

// ============= WEBRTC ФУНКЦИОНАЛ =============

async function initMediaStreams() {
    try {
        console.log('Запрос доступа к камере и микрофону...');
        AppState.localStream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
        
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = AppState.localStream;
        }
        
        console.log('Медиа-поток получен');
        return true;
    } catch (error) {
        console.error('Ошибка получения медиа-потока:', error);
        alert('Не удалось получить доступ к камере/микрофону. Проверьте разрешения.');
        return false;
    }
}

function createPeerConnection() {
    AppState.peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
    
    // Добавляем локальные треки
    if (AppState.localStream) {
        AppState.localStream.getTracks().forEach(track => {
            AppState.peerConnection.addTrack(track, AppState.localStream);
        });
    }
    
    // Обработчик для удалённого потока
    AppState.peerConnection.ontrack = (event) => {
        console.log('Получен удалённый трек:', event.track.kind);
        
        if (!AppState.remoteStream) {
            AppState.remoteStream = new MediaStream();
            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) {
                remoteVideo.srcObject = AppState.remoteStream;
            }
        }
        
        AppState.remoteStream.addTrack(event.track);
        
        // Скрываем placeholder
        const placeholder = document.getElementById('remotePlaceholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    };
    
    // ICE кандидаты
    AppState.peerConnection.onicecandidate = (event) => {
        if (event.candidate && SignalingState.socket) {
            sendSignalingMessage({
                type: 'ice-candidate',
                payload: event.candidate
            });
        }
    };
    
    // Состояние подключения
    AppState.peerConnection.onconnectionstatechange = () => {
        console.log('Состояние подключения:', AppState.peerConnection.connectionState);
        updateCallStatus(AppState.peerConnection.connectionState);
    };
    
    console.log('PeerConnection создан');
}

function updateCallStatus(state) {
    const statusText = document.getElementById('callStatusText');
    if (!statusText) return;
    
    const statusMap = {
        'connecting': 'Подключаемся...',
        'connected': 'Соединение установлено',
        'disconnected': 'Соединение потеряно',
        'failed': 'Ошибка подключения',
        'closed': 'Звонок завершён'
    };
    
    statusText.textContent = statusMap[state] || state;
}

// ============= SIGNALING SERVER =============

function normalizeSignalingUrl(rawUrl) {
    if (!rawUrl) return '';
    let url = rawUrl.trim();
    
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
        // already includes protocol
    } else if (url.startsWith('http://')) {
        url = url.replace('http://', 'ws://');
    } else if (url.startsWith('https://')) {
        url = url.replace('https://', 'wss://');
    } else {
        url = `wss://${url}`;
    }
    
    const hasPath = /wss?:\/\/[^/]+\/.+/.test(url);
    if (!hasPath) {
        url = url.endsWith('/') ? `${url}ws` : `${url}/ws`;
    }
    
    return url;
}

function connectSignaling(url, roomId) {
    // Если параметры не переданы, используем из AppState
    const signalingUrl = url || AppState.signalingUrl;
    const room = roomId || AppState.roomId;
    
    if (!signalingUrl || !room) {
        console.warn('Нет signaling URL или room ID');
        return Promise.resolve();
    }
    
    const normalizedUrl = normalizeSignalingUrl(signalingUrl);
    
    return new Promise((resolve, reject) => {
        try {
            SignalingState.socket = new WebSocket(normalizedUrl);
            SignalingState.shouldReconnect = true;
            
            SignalingState.socket.onopen = () => {
                console.log('WebSocket соединение установлено');
                SignalingState.isReady = true;
                
                // Присоединяемся к комнате
                SignalingState.socket.send(JSON.stringify({
                    type: 'join',
                    roomId: room
                }));
                
                // Отправляем накопленные сообщения
                while (SignalingState.messageQueue.length > 0) {
                    const msg = SignalingState.messageQueue.shift();
                    SignalingState.socket.send(JSON.stringify(msg));
                }
                
                if (AppState.isDevelopment) {
                    updateDevStatus(`Подключено к ${room}`);
                }
                
                resolve();
            };
            
            SignalingState.socket.onmessage = handleSignalingMessage;
            
            SignalingState.socket.onerror = (error) => {
                console.error('WebSocket ошибка:', error);
                SignalingState.isReady = false;
                if (AppState.isDevelopment) {
                    updateDevStatus('Ошибка подключения к signaling серверу');
                }
                reject(error);
            };
            
            SignalingState.socket.onclose = () => {
                console.log('WebSocket соединение закрыто');
                SignalingState.isReady = false;
                
                if (SignalingState.shouldReconnect) {
                    attemptReconnect(normalizedUrl, room);
                }
            };
            
        } catch (error) {
            console.error('Ошибка создания WebSocket:', error);
            if (AppState.isDevelopment) {
                updateDevStatus('Неверный URL');
            }
            reject(error);
        }
    });
}

function attemptReconnect(url, roomId) {
    if (SignalingState.reconnectTimeout) {
        clearTimeout(SignalingState.reconnectTimeout);
    }
    
    SignalingState.reconnectTimeout = setTimeout(() => {
        console.log('Попытка переподключения...');
        connectSignaling(url, roomId).catch(err => {
            console.error('Ошибка переподключения:', err);
        });
    }, 3000);
}

function sendSignalingMessage(message) {
    if (SignalingState.isReady && SignalingState.socket) {
        SignalingState.socket.send(JSON.stringify(message));
    } else {
        SignalingState.messageQueue.push(message);
    }
}

async function handleSignalingMessage(event) {
    try {
        const data = JSON.parse(event.data);
        console.log('Получено signaling сообщение:', data.type);
        
        switch (data.type) {
            case 'offer':
                await handleOffer(data.payload);
                break;
            case 'answer':
                await handleAnswer(data.payload);
                break;
            case 'ice-candidate':
                await handleIceCandidate(data.payload);
                break;
            case 'system':
                console.log('System:', data.message);
                break;
            default:
                console.log('Неизвестный тип сообщения:', data.type);
        }
    } catch (error) {
        console.error('Ошибка обработки signaling сообщения:', error);
    }
}

async function handleOffer(offer) {
    // В режиме волонтера автоматически принимаем вызов
    if (AppState.role === 'volunteer' && !AppState.isCallActive) {
        console.log('Волонтер: входящий вызов');
        
        // Получаем медиа-поток
        const mediaSuccess = await initMediaStreams();
        if (!mediaSuccess) {
            console.error('Не удалось получить медиа-поток');
            return;
        }
        
        // Показываем экран звонка
        showScreen('call');
        AppState.isCallActive = true;
        AppState.callStartTime = Date.now();
        startCallTimer();
        
        document.getElementById('volunteerName').textContent = 'Пользователь';
    }
    
    if (!AppState.peerConnection) {
        createPeerConnection();
    }
    
    await AppState.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('Offer установлен');
    
    const answer = await AppState.peerConnection.createAnswer();
    await AppState.peerConnection.setLocalDescription(answer);
    
    sendSignalingMessage({
        type: 'answer',
        payload: answer
    });
    
    console.log('Answer отправлен');
}

async function handleAnswer(answer) {
    await AppState.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log('Answer установлен');
}

async function handleIceCandidate(candidate) {
    if (AppState.peerConnection) {
        await AppState.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('ICE кандидат добавлен');
    }
}

async function startCall() {
    if (!AppState.localStream) {
        const success = await initMediaStreams();
        if (!success) return;
    }
    
    createPeerConnection();
    
    // Создаём offer
    const offer = await AppState.peerConnection.createOffer();
    await AppState.peerConnection.setLocalDescription(offer);
    
    sendSignalingMessage({
        type: 'offer',
        payload: offer
    });
    
    console.log('Offer отправлен');
}

function stopMediaStreams() {
    if (AppState.localStream) {
        AppState.localStream.getTracks().forEach(track => track.stop());
        AppState.localStream = null;
    }
    
    if (AppState.remoteStream) {
        AppState.remoteStream.getTracks().forEach(track => track.stop());
        AppState.remoteStream = null;
    }
    
    if (AppState.peerConnection) {
        AppState.peerConnection.close();
        AppState.peerConnection = null;
    }
    
    if (SignalingState.socket) {
        SignalingState.shouldReconnect = false;
        SignalingState.socket.close();
        SignalingState.socket = null;
    }
    
    console.log('Медиа-потоки остановлены');
}

function toggleMute() {
    if (!AppState.localStream) return;
    
    const audioTrack = AppState.localStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        AppState.isMuted = !audioTrack.enabled;
        
        const muteBtn = document.getElementById('muteBtn');
        const muteText = muteBtn.querySelector('.control-text');
        muteText.textContent = AppState.isMuted ? 'Вкл. микрофон' : 'Выкл. микрофон';
        
        console.log('Микрофон:', AppState.isMuted ? 'выключен' : 'включен');
    }
}

function toggleCamera() {
    if (!AppState.localStream) return;
    
    const videoTrack = AppState.localStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        AppState.isCameraOff = !videoTrack.enabled;
        
        const cameraBtn = document.getElementById('cameraBtn');
        const cameraText = cameraBtn.querySelector('.control-text');
        cameraText.textContent = AppState.isCameraOff ? 'Вкл. камеру' : 'Выкл. камеру';
        
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.style.display = AppState.isCameraOff ? 'none' : 'block';
        }
        
        console.log('Камера:', AppState.isCameraOff ? 'выключена' : 'включена');
    }
}

// Обновляем обработчики кнопок
document.getElementById('muteBtn')?.addEventListener('click', toggleMute);
const cameraBtn = document.getElementById('cameraBtn');
if (cameraBtn) {
    cameraBtn.addEventListener('click', toggleCamera);
}

// ============= DEV MODE =============

function initDevMode() {
    const panel = document.getElementById('devPanel');
    if (!panel) return;
    
    panel.classList.remove('hidden');
    
    const params = new URLSearchParams(window.location.search);
    
    let storedUrl = '';
    let storedRoom = '';
    let storedRole = 'user';
    try {
        storedUrl = localStorage.getItem('devSignalingUrl') || '';
        storedRoom = localStorage.getItem('devRoomId') || '';
        storedRole = localStorage.getItem('devRole') || 'user';
    } catch (error) {
        console.warn('localStorage недоступен', error);
    }
    
    AppState.signalingUrl = params.get('signal') || storedUrl || AppState.signalingUrl;
    AppState.roomId = params.get('room') || storedRoom || 'test-room';
    AppState.role = (params.get('role') || storedRole || 'user').toLowerCase();
    
    const signalingInput = document.getElementById('devSignalingUrl');
    const roomInput = document.getElementById('devRoomId');
    
    if (signalingInput) signalingInput.value = AppState.signalingUrl || '';
    if (roomInput) roomInput.value = AppState.roomId || '';
    
    setRole(AppState.role);
    
    const saveBtn = document.getElementById('devSaveBtn');
    const resetBtn = document.getElementById('devResetBtn');
    const volunteerBtn = document.getElementById('devVolunteerToggle');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            AppState.signalingUrl = document.getElementById('devSignalingUrl').value.trim();
            AppState.roomId = document.getElementById('devRoomId').value.trim() || 'test-room';
            persistDevSettings();
            
            if (AppState.signalingUrl && AppState.roomId) {
                updateDevStatus('Настройки сохранены. Готово к звонку.');
            } else {
                updateDevStatus('Укажите адрес сервера и Room ID');
            }
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (signalingInput) signalingInput.value = '';
            if (roomInput) roomInput.value = '';
            AppState.signalingUrl = '';
            AppState.roomId = '';
            setRole('user');
            persistDevSettings();
            SignalingState.shouldReconnect = false;
            if (SignalingState.socket) {
                SignalingState.socket.close();
                SignalingState.socket = null;
            }
            updateDevStatus('Настройки сброшены');
        });
    }
    
    if (volunteerBtn) {
        volunteerBtn.addEventListener('click', () => {
            const nextRole = AppState.role === 'volunteer' ? 'user' : 'volunteer';
            setRole(nextRole);
            persistDevSettings();
        });
    }
    
    updateDevStatus('Введите настройки и нажмите "Сохранить"');
}

function persistDevSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem('devSignalingUrl', AppState.signalingUrl || '');
        localStorage.setItem('devRoomId', AppState.roomId || '');
        localStorage.setItem('devRole', AppState.role || 'user');
    } catch (error) {
        console.warn('Не удалось сохранить dev настройки', error);
    }
}

function setRole(role) {
    const normalized = role === 'volunteer' ? 'volunteer' : 'user';
    AppState.role = normalized;
    const volunteerBtn = document.getElementById('devVolunteerToggle');
    
    if (volunteerBtn) {
        volunteerBtn.textContent = normalized === 'volunteer'
            ? 'Выйти из режима волонтёра'
            : 'Режим волонтёра';
        volunteerBtn.classList.toggle('active', normalized === 'volunteer');
    }
    
    console.log('Режим:', normalized === 'volunteer' ? 'Волонтёр' : 'Пользователь');
}

function updateDevStatus(message) {
    const statusEl = document.getElementById('devStatusText');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

// Инициализация dev mode если в режиме разработки
if (AppState.isDevelopment) {
    initDevMode();
}

// Логирование для отладки
console.log('Мини-приложение загружено');
console.log('Режим:', typeof MaxBridge !== 'undefined' ? 'Продакшн (MAX)' : 'Разработка');

