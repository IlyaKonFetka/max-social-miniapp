/**
 * MAX Мини-приложение: Помощь слабовидящим
 * Хакатон 573
 */

const AppState = {
    isMaxReady: false,
    isCallActive: false,
    selectedAction: null,
    callStartTime: null,
    callTimerInterval: null,
    userData: null,
    localStream: null,
    remoteStream: null,
    peerConnection: null,
    isMuted: false,
    isCameraOff: false,
    isDevelopment: typeof MaxBridge === 'undefined',
    bridgeListenerRegistered: false,
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

if (typeof MaxBridge !== 'undefined') {
    console.log('✅ MAX Bridge доступен');
    
    MaxBridge.ready(() => {
        console.log('✅ MAX Bridge готов');
        AppState.isMaxReady = true;
        updateStatus('connected', 'Подключено к MAX');
        enableCallButton();
        
        getUserData();
        setupBridgeListeners();
    });
} else {
    console.warn('⚠️ MAX Bridge недоступен - работа в режиме разработки');
    setTimeout(() => {
        AppState.isMaxReady = true;
        updateStatus('connected', 'Режим разработки');
        enableCallButton();
        setupBridgeListeners();
    }, 1000);
}

if (AppState.isDevelopment) {
    initDevMode();
}


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


// ============= DEV MODE / SIGNALING =============

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
        console.warn('⚠️ localStorage недоступен', error);
    }
    
    AppState.signalingUrl = params.get('signal') || storedUrl;
    AppState.roomId = params.get('room') || storedRoom || 'test-room';
    AppState.role = (params.get('role') || storedRole || 'user').toLowerCase();
    
    document.getElementById('devSignalingUrl').value = AppState.signalingUrl || '';
    document.getElementById('devRoomId').value = AppState.roomId || '';
    
    setRole(AppState.role);
    
    document.getElementById('devSaveBtn').addEventListener('click', () => {
        AppState.signalingUrl = document.getElementById('devSignalingUrl').value.trim();
        AppState.roomId = document.getElementById('devRoomId').value.trim() || 'test-room';
        persistDevSettings();
        
        if (AppState.signalingUrl && AppState.roomId) {
            connectSignaling(true).catch(err => {
                console.error('❌ Не удалось подключиться к сигнальному серверу', err);
            });
        } else {
            updateDevStatus('Укажите адрес сервера и Room ID');
        }
    });
    
    document.getElementById('devResetBtn').addEventListener('click', () => {
        document.getElementById('devSignalingUrl').value = '';
        document.getElementById('devRoomId').value = '';
        AppState.signalingUrl = '';
        AppState.roomId = '';
        setRole('user');
        persistDevSettings();
        SignalingState.shouldReconnect = false;
        disconnectSignaling();
        updateDevStatus('Настройки сброшены');
        enableCallButton();
    });
    
    document.getElementById('devVolunteerToggle').addEventListener('click', () => {
        const nextRole = AppState.role === 'volunteer' ? 'user' : 'volunteer';
        setRole(nextRole);
        persistDevSettings();
        
        if (AppState.signalingUrl && AppState.roomId) {
            connectSignaling().catch(err => console.warn('⚠️ Не удалось подключиться', err));
        }
    });
    
    if (AppState.signalingUrl && AppState.roomId) {
        connectSignaling(true).catch(err => console.warn('⚠️ Нет сигнального сервера', err));
    } else {
        updateDevStatus('Введите адрес сигнального сервера для теста');
    }
}

function persistDevSettings() {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem('devSignalingUrl', AppState.signalingUrl || '');
        localStorage.setItem('devRoomId', AppState.roomId || '');
        localStorage.setItem('devRole', AppState.role || 'user');
    } catch (error) {
        console.warn('⚠️ Не удалось сохранить dev настройки', error);
    }
}

function setRole(role) {
    const normalized = role === 'volunteer' ? 'volunteer' : 'user';
    AppState.role = normalized;
    const callBtn = document.getElementById('callBtn');
    const volunteerBtn = document.getElementById('devVolunteerToggle');
    
    if (volunteerBtn) {
        volunteerBtn.textContent = normalized === 'volunteer'
            ? 'Выйти из режима волонтёра'
            : 'Режим волонтёра';
        volunteerBtn.classList.toggle('active', normalized === 'volunteer');
    }
    
    if (callBtn) {
        if (normalized === 'volunteer') {
            callBtn.disabled = true;
        } else if (AppState.isMaxReady) {
            callBtn.disabled = false;
        }
    }
    
    updateDevStatus(normalized === 'volunteer'
        ? '🧑‍🤝‍🧑 Волонтёр ждёт входящий вызов'
        : '🙋 Режим пользователя');
    
    persistDevSettings();
}

function updateDevStatus(message) {
    const statusEl = document.getElementById('devStatusText');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

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

function connectSignaling(force = false) {
    if (!AppState.isDevelopment) {
        return Promise.resolve(true);
    }
    
    if (!AppState.signalingUrl || !AppState.roomId) {
        updateDevStatus('Укажите signaling URL и Room ID');
        return Promise.reject(new Error('missing signaling config'));
    }
    
    if (!force && SignalingState.socket) {
        if (SignalingState.socket.readyState === WebSocket.OPEN) {
            return Promise.resolve(true);
        }
        if (SignalingState.socket.readyState === WebSocket.CONNECTING) {
            return new Promise((resolve, reject) => {
                const handleOpen = () => {
                    SignalingState.socket.removeEventListener('error', handleError);
                    resolve(true);
                };
                const handleError = error => {
                    SignalingState.socket.removeEventListener('open', handleOpen);
                    reject(error);
                };
                SignalingState.socket.addEventListener('open', handleOpen, { once: true });
                SignalingState.socket.addEventListener('error', handleError, { once: true });
            });
        }
    }
    
    disconnectSignaling();
    SignalingState.shouldReconnect = true;
    
    const url = normalizeSignalingUrl(AppState.signalingUrl);
    let socket;
    try {
        socket = new WebSocket(url);
    } catch (error) {
        updateDevStatus('Неверный адрес сигнального сервера');
        return Promise.reject(error);
    }
    
    SignalingState.socket = socket;
    updateDevStatus('Подключаемся к сигнальному серверу...');
    
    return new Promise((resolve, reject) => {
        let settled = false;
        
        socket.onopen = () => {
            settled = true;
            SignalingState.isReady = true;
            updateDevStatus(`В комнате ${AppState.roomId}`);
            socket.send(JSON.stringify({ type: 'join', roomId: AppState.roomId }));
            flushSignalingQueue();
            resolve(true);
        };
        
        socket.onmessage = event => handleSignalingMessage(event);
        
        socket.onerror = error => {
            console.error('❌ Ошибка сигнального сервера', error);
            if (!settled) {
                settled = true;
                reject(error);
            }
            updateDevStatus('Ошибка сигнального канала');
        };
        
        socket.onclose = () => {
            SignalingState.isReady = false;
            if (!settled) {
                settled = true;
                reject(new Error('socket closed'));
            } else {
                updateDevStatus('Соединение закрыто');
            }
            
            if (SignalingState.shouldReconnect) {
                scheduleSignalingReconnect();
            }
        };
    });
}

function disconnectSignaling() {
    if (SignalingState.reconnectTimeout) {
        clearTimeout(SignalingState.reconnectTimeout);
        SignalingState.reconnectTimeout = null;
    }
    
    if (SignalingState.socket) {
        try {
            SignalingState.socket.onopen = null;
            SignalingState.socket.onclose = null;
            SignalingState.socket.onerror = null;
            SignalingState.socket.onmessage = null;
            SignalingState.socket.close();
        } catch (error) {
            console.warn('⚠️ Ошибка закрытия сокета', error);
        }
    }
    
    SignalingState.socket = null;
    SignalingState.isReady = false;
}

function scheduleSignalingReconnect() {
    if (!AppState.signalingUrl || !AppState.roomId) return;
    if (SignalingState.reconnectTimeout) return;
    
    SignalingState.reconnectTimeout = setTimeout(() => {
        SignalingState.reconnectTimeout = null;
        connectSignaling(true).catch(err => console.warn('⚠️ Повторное подключение не удалось', err));
    }, 2000);
}

async function ensureSignalingReady() {
    if (!AppState.isDevelopment) return true;
    
    try {
        await connectSignaling();
        return true;
    } catch (error) {
        console.error('❌ Нет сигнального сервера', error);
        alert('Настройте сигнальный сервер в блоке "Режим тестирования"');
        return false;
    }
}

function sendViaSignaling(message) {
    if (!AppState.isDevelopment) return;
    if (!AppState.signalingUrl || !AppState.roomId) {
        console.warn('⚠️ Не задан signaling URL или Room ID');
        return;
    }
    
    const payload = {
        ...message,
        roomId: AppState.roomId
    };
    
    if (SignalingState.socket && SignalingState.socket.readyState === WebSocket.OPEN) {
        SignalingState.socket.send(JSON.stringify(payload));
    } else {
        SignalingState.messageQueue.push(payload);
        connectSignaling().catch(err => console.warn('⚠️ Не удалось установить соединение для отправки', err));
    }
}

function flushSignalingQueue() {
    if (!SignalingState.socket || SignalingState.socket.readyState !== WebSocket.OPEN) return;
    while (SignalingState.messageQueue.length) {
        const msg = SignalingState.messageQueue.shift();
        SignalingState.socket.send(JSON.stringify(msg));
    }
}

function handleSignalingMessage(event) {
    if (!event.data) return;
    
    let data;
    try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    } catch (error) {
        console.warn('⚠️ Некорректное сообщение сигнала', error);
        return;
    }
    
    if (!data || !data.type) return;
    
    if (data.type === 'system') {
        updateDevStatus(data.message || 'Системное сообщение');
        return;
    }
    
    if (data.type === 'error') {
        updateDevStatus(`Ошибка: ${data.message}`);
        return;
    }
    
    processSignalMessage(data);
}

function processSignalMessage(message) {
    if (!message || !message.type) return;
    
    switch (message.type) {
        case 'webrtc_offer':
            handleIncomingOffer(message.payload);
            break;
        case 'webrtc_answer':
            handleRemoteAnswer(message.payload);
            break;
        case 'webrtc_ice_candidate':
            handleRemoteIceCandidate(message.payload);
            break;
        case 'call_cancelled':
            updateCallStatus('Волонтёр завершил вызов');
            endCall({ silent: true });
            break;
        case 'call_accept':
            updateCallStatus('Волонтёр подключается...');
            break;
        case 'call_ended':
            updateCallStatus('Звонок завершён');
            endCall({ silent: true });
            break;
        default:
            console.log('📨 Сигнал:', message);
            break;
    }
}

async function handleIncomingOffer(payload) {
    if (!payload) return;
    
    console.log('📥 Получен SDP offer от пользователя');
    
    try {
        await ensureLocalStream();
        await initializePeerConnection({ createOffer: false });
        
        const description = new RTCSessionDescription(payload);
        await AppState.peerConnection.setRemoteDescription(description);
        
        const answer = await AppState.peerConnection.createAnswer();
        await AppState.peerConnection.setLocalDescription(answer);
        
        sendSignal('webrtc_answer', answer);
        
        AppState.callStartTime = Date.now();
        startCallTimer();
        AppState.isCallActive = true;
        
        document.getElementById('volunteerName').textContent = 'Пользователь онлайн';
        showScreen('call');
        updateCallStatus('Соединяемся с пользователем...');
        
        console.log('✅ Отправлен SDP answer пользователю');
    } catch (error) {
        console.error('❌ Ошибка обработки входящего offer', error);
        updateCallStatus('Не удалось принять звонок');
    }
}

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
    if (!callBtn) return;
    callBtn.disabled = AppState.role === 'volunteer' ? true : false;
}

function updateCallStatus(message) {
    const statusText = document.getElementById('callStatusText');
    if (statusText) {
        statusText.textContent = message;
    }
}



document.getElementById('callBtn').addEventListener('click', () => {
    if (AppState.role === 'volunteer') {
        alert('Вы в режиме волонтёра — ожидайте входящий вызов.');
        return;
    }
    
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

document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', function() {
        document.querySelectorAll('.action-card').forEach(c => {
            c.classList.remove('selected');
        });
        
        this.classList.add('selected');
        
        AppState.selectedAction = this.dataset.action;
        
        const actionText = this.querySelector('.action-text').textContent;
        document.querySelector('.btn-text').textContent = `Позвать: ${actionText}`;
        
        console.log('✅ Выбрано действие:', AppState.selectedAction);
    });
});

document.getElementById('cancelWaitBtn').addEventListener('click', () => {
    cancelCall();
});

document.getElementById('endCallBtn').addEventListener('click', () => {
    endCall();
});

document.getElementById('muteBtn').addEventListener('click', () => {
    toggleMicrophone();
});

document.getElementById('cameraBtn').addEventListener('click', () => {
    toggleCamera();
});

document.getElementById('toggleChatBtn').addEventListener('click', () => {
    alert('💬 Чат будет реализован в следующей версии');
    // TODO: Открыть чат интерфейс
});

// ============= ЛОГИКА ЗВОНКА =============

async function startCallProcess() {
    console.log('📞 Начало процесса вызова...');
    
    if (AppState.isDevelopment) {
        const signalingReady = await ensureSignalingReady();
        if (!signalingReady) {
            return;
        }
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Ваш браузер не поддерживает видеозвонки');
        return;
    }

    try {
        await ensureLocalStream();
    } catch (error) {
        console.error('❌ Не удалось получить доступ к камере/микрофону', error);
        alert('Не удалось получить доступ к камере и микрофону. Проверьте разрешения.');
        return;
    }

    resetCallTimer();
    updateCallStatus('Ищем волонтёра...');
    
    // Показываем экран ожидания
    showScreen('waiting');
    
    sendCallRequestToBot();
    
    setTimeout(() => {
        connectToVolunteer();
    }, 3000);
}

function sendCallRequestToBot() {
    if (typeof MaxBridge !== 'undefined' && MaxBridge.sendData) {
        MaxBridge.sendData({
            type: 'call_request',
            action: AppState.selectedAction,
            media: { audio: true, video: true },
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

async function connectToVolunteer() {
    console.log('✅ Волонтёр найден!');
    
    try {
        await ensureLocalStream();
    } catch (error) {
        console.error('❌ Не удалось подготовить медиа', error);
        alert('Не удалось подготовить камеру и микрофон');
        showScreen('main');
        return;
    }
    
    showScreen('call');
    updateCallStatus('Подключаемся к волонтёру...');
    
    AppState.callStartTime = Date.now();
    startCallTimer();
    
    document.getElementById('volunteerName').textContent = 'Волонтёр #' + Math.floor(Math.random() * 9999);
    
    AppState.isCallActive = true;
    
    await initializePeerConnection();
    
    if (typeof MaxBridge !== 'undefined' && MaxBridge.sendData) {
        MaxBridge.sendData({
            type: 'call_started',
            timestamp: Date.now()
        });
    }
}

function cancelCall() {
    console.log('❌ Вызов отменён');
    
    resetCallTimer();
    cleanupMediaSession();
    
    sendSignal('call_cancelled');
    
    showScreen('main');
    
    resetActionSelection();
    AppState.isCallActive = false;
}

function endCall(options = {}) {
    const { silent = false } = options;
    console.log('📵 Звонок завершён');
    
    stopCallTimer();
    
    const duration = AppState.callStartTime
        ? Math.floor((Date.now() - AppState.callStartTime) / 1000)
        : 0;
    console.log(`⏱️ Длительность звонка: ${duration} сек`);
    
    if (!silent) {
        sendSignal('call_ended', { duration });
    }
    
    if (silent) {
        updateCallStatus('Собеседник завершил звонок');
    } else {
        showThankYouMessage();
    }
    cleanupMediaSession();
    
    setTimeout(() => {
        showScreen('main');
        resetActionSelection();
    }, 2000);
    
    AppState.isCallActive = false;
}

function showThankYouMessage() {
    updateCallStatus('Спасибо! Звонок завершён.');
    setTimeout(() => {
        updateCallStatus('Подключаемся к волонтёру...');
    }, 4000);
}


async function ensureLocalStream() {
    if (AppState.localStream) {
        return AppState.localStream;
    }
    
    const stream = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
    AppState.localStream = stream;
    AppState.isMuted = false;
    AppState.isCameraOff = false;
    attachLocalStream(stream);
    return stream;
}

function attachLocalStream(stream) {
    const localVideo = document.getElementById('localVideo');
    if (localVideo) {
        localVideo.srcObject = stream;
    }
    
    if (AppState.isDevelopment && !AppState.remoteStream) {
        const remoteVideo = document.getElementById('remoteVideo');
        const placeholder = document.getElementById('remotePlaceholder');
        if (remoteVideo) {
            remoteVideo.srcObject = stream;
        }
        if (placeholder) {
            placeholder.classList.add('hidden');
        }
        updateCallStatus('Демо-режим: отображается ваш поток');
    }
    
    resetControlButtons();
}

async function initializePeerConnection(options = {}) {
    const { createOffer = true } = options;
    
    if (!window.RTCPeerConnection) {
        updateCallStatus('WebRTC не поддерживается в этом браузере');
        return null;
    }
    
    if (AppState.peerConnection) {
        return AppState.peerConnection;
    }
    
    const peer = new RTCPeerConnection(RTC_CONFIGURATION);
    AppState.peerConnection = peer;
    
    peer.ontrack = handleRemoteTrack;
    peer.onicecandidate = event => handleIceCandidate(event);
    peer.onconnectionstatechange = () => handleConnectionState(peer.connectionState);
    
    const localStream = await ensureLocalStream();
    localStream.getTracks().forEach(track => peer.addTrack(track, localStream));
    
    if (createOffer) {
        try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            sendSignal('webrtc_offer', offer);
            console.log('📡 SDP offer отправлен волонтёру');
        } catch (error) {
            console.error('❌ Ошибка создания SDP', error);
            updateCallStatus('Не удалось создать видеозвонок');
        }
    }
    
    return peer;
}

async function handleRemoteAnswer(payload) {
    if (!AppState.peerConnection || !payload) return;
    
    try {
        const description = new RTCSessionDescription(payload);
        await AppState.peerConnection.setRemoteDescription(description);
        updateCallStatus('Видеосвязь установлена');
    } catch (error) {
        console.error('❌ Ошибка применения SDP ответа', error);
    }
}

function handleRemoteIceCandidate(payload) {
    if (!AppState.peerConnection || !payload) return;
    
    AppState.peerConnection.addIceCandidate(new RTCIceCandidate(payload))
        .catch(error => console.error('❌ Ошибка добавления ICE кандидата', error));
}

function handleRemoteTrack(event) {
    if (!event.streams || !event.streams[0]) return;
    
    AppState.remoteStream = event.streams[0];
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo) {
        remoteVideo.srcObject = AppState.remoteStream;
    }
    
    const placeholder = document.getElementById('remotePlaceholder');
    if (placeholder) {
        placeholder.classList.add('hidden');
    }
    
    updateCallStatus('Волонтёр подключился');
}

function handleConnectionState(state) {
    switch (state) {
        case 'connected':
            updateCallStatus('Волонтёр подключился');
            break;
        case 'failed':
        case 'disconnected':
            updateCallStatus('Соединение потеряно, пробуем восстановить...');
            break;
        case 'closed':
            updateCallStatus('Соединение завершено');
            break;
        default:
            break;
    }
}

function handleIceCandidate(event) {
    if (event.candidate) {
        sendSignal('webrtc_ice_candidate', event.candidate);
    }
}

function sendSignal(type, payload) {
    const message = {
        type,
        payload,
        timestamp: Date.now()
    };
    
    if (typeof MaxBridge !== 'undefined' && MaxBridge.sendData) {
        MaxBridge.sendData(message).catch(err => {
            console.error('❌ Ошибка отправки сигнала MAX Bridge', err);
        });
    }
    
    if (AppState.isDevelopment) {
        sendViaSignaling(message);
    } else if (typeof MaxBridge === 'undefined') {
        console.log('📨 Dev сигнал:', message);
    }
}

function setupBridgeListeners() {
    if (AppState.bridgeListenerRegistered) return;
    
    if (typeof MaxBridge === 'undefined') {
        console.log('ℹ️ Входящие сигналы недоступны (режим разработки)');
        AppState.bridgeListenerRegistered = true;
        return;
    }
    
    const handler = data => handleBridgeMessage(data);
    
    if (typeof MaxBridge.onData === 'function') {
        MaxBridge.onData(handler);
    } else if (typeof MaxBridge.on === 'function') {
        MaxBridge.on('data', handler);
    } else if (typeof MaxBridge.subscribe === 'function') {
        MaxBridge.subscribe('data', handler);
    } else {
        console.warn('⚠️ MAX Bridge не предоставляет API для подписки на данные');
    }
    
    AppState.bridgeListenerRegistered = true;
}

function handleBridgeMessage(message) {
    if (!message) return;
    processSignalMessage(message);
}

function toggleMicrophone() {
    if (!AppState.localStream) {
        console.warn('Нет локального медиа-потока для управления микрофоном');
        return;
    }
    
    const audioTracks = AppState.localStream.getAudioTracks();
    if (!audioTracks.length) return;
    
    AppState.isMuted = !AppState.isMuted;
    audioTracks.forEach(track => {
        track.enabled = !AppState.isMuted;
    });
    
    resetControlButtons();
    console.log(AppState.isMuted ? '🔇 Микрофон выключен' : '🔊 Микрофон включен');
}

function toggleCamera() {
    if (!AppState.localStream) {
        console.warn('Нет локального медиа-потока для управления камерой');
        return;
    }
    
    const videoTracks = AppState.localStream.getVideoTracks();
    if (!videoTracks.length) return;
    
    AppState.isCameraOff = !AppState.isCameraOff;
    videoTracks.forEach(track => {
        track.enabled = !AppState.isCameraOff;
    });
    
    resetControlButtons();
    console.log(AppState.isCameraOff ? '🎥 Камера выключена' : '🎥 Камера включена');
}

function resetControlButtons() {
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        const icon = muteBtn.querySelector('.control-icon');
        const text = muteBtn.querySelector('.control-text');
        if (icon) icon.textContent = AppState.isMuted ? '🔊' : '🔇';
        if (text) text.textContent = AppState.isMuted ? 'Вкл. микрофон' : 'Выкл. микрофон';
    }
    
    const cameraBtn = document.getElementById('cameraBtn');
    if (cameraBtn) {
        const icon = cameraBtn.querySelector('.control-icon');
        const text = cameraBtn.querySelector('.control-text');
        if (icon) icon.textContent = AppState.isCameraOff ? '📷' : '🎥';
        if (text) text.textContent = AppState.isCameraOff ? 'Вкл. камеру' : 'Выкл. камеру';
    }
}

function cleanupMediaSession() {
    if (AppState.peerConnection) {
        AppState.peerConnection.onconnectionstatechange = null;
        AppState.peerConnection.ontrack = null;
        AppState.peerConnection.onicecandidate = null;
        AppState.peerConnection.close();
        AppState.peerConnection = null;
    }
    
    if (AppState.localStream) {
        AppState.localStream.getTracks().forEach(track => track.stop());
        AppState.localStream = null;
    }
    
    if (AppState.remoteStream) {
        AppState.remoteStream.getTracks().forEach(track => track.stop());
        AppState.remoteStream = null;
    }
    
    const localVideo = document.getElementById('localVideo');
    if (localVideo) localVideo.srcObject = null;
    
    const remoteVideo = document.getElementById('remoteVideo');
    if (remoteVideo) remoteVideo.srcObject = null;
    
    const placeholder = document.getElementById('remotePlaceholder');
    if (placeholder) placeholder.classList.remove('hidden');
    
    AppState.isMuted = false;
    AppState.isCameraOff = false;
    AppState.callStartTime = null;
    resetControlButtons();
    updateCallStatus('Подключаемся к волонтёру...');
}


function startCallTimer() {
    const timerElement = document.getElementById('callTimer');
    
    stopCallTimer();
    updateTimerDisplay(0);
    
    AppState.callTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - AppState.callStartTime) / 1000);
        updateTimerDisplay(elapsed);
    }, 1000);
}

function stopCallTimer() {
    if (AppState.callTimerInterval) {
        clearInterval(AppState.callTimerInterval);
        AppState.callTimerInterval = null;
    }
}

function resetCallTimer() {
    stopCallTimer();
    updateTimerDisplay(0);
}

function updateTimerDisplay(secondsTotal) {
    const timerElement = document.getElementById('callTimer');
    if (!timerElement) return;
    
    const minutes = Math.floor(secondsTotal / 60);
    const seconds = secondsTotal % 60;
    
    timerElement.textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


function showScreen(screenName) {
    document.getElementById('mainScreen').classList.add('hidden');
    document.getElementById('waitingScreen').classList.add('hidden');
    document.getElementById('callScreen').classList.add('hidden');
    
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
    AppState.selectedAction = null;
    
    document.querySelectorAll('.action-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    document.querySelector('.btn-text').textContent = 'Позвать волонтёра';
}

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

console.log('📱 Мини-приложение загружено');
console.log('🔧 Режим:', typeof MaxBridge !== 'undefined' ? 'Продакшн (MAX)' : 'Разработка');
