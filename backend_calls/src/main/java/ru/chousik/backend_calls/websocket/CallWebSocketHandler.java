package ru.chousik.backend_calls.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class CallWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(CallWebSocketHandler.class);

    private final Map<String, Set<WebSocketSession>> roomSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String roomId = getRoomId(session);
        roomSessions.computeIfAbsent(roomId, key -> ConcurrentHashMap.newKeySet()).add(session);
        log.info("Session {} joined room {}", session.getId(), roomId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String roomId = getRoomId(session);
        broadcast(roomId, session, message);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        String roomId = getRoomId(session);
        Set<WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                roomSessions.remove(roomId);
            }
        }
        log.info("Session {} left room {}", session.getId(), roomId);
    }

    private void broadcast(String roomId, WebSocketSession source, TextMessage message) throws IOException {
        Set<WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions == null) {
            return;
        }

        for (WebSocketSession session : sessions) {
            if (!session.equals(source) && session.isOpen()) {
                session.sendMessage(message);
            }
        }
    }

    private String getRoomId(WebSocketSession session) {
        String roomId = (String) session.getAttributes().get("roomId");
        if (roomId != null) {
            return roomId;
        }

        String query = session.getUri() != null ? session.getUri().getQuery() : null;
        if (query != null) {
            for (String param : query.split("&")) {
                String[] pair = param.split("=");
                if (pair.length == 2 && pair[0].equals("roomId")) {
                    session.getAttributes().put("roomId", pair[1]);
                    return pair[1];
                }
            }
        }

        throw new IllegalStateException("roomId query parameter is required");
    }
}
