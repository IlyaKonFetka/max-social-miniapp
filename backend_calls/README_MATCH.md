# Matchmaking API

New endpoints expose a lightweight in-memory queue that pairs пользователей и волонтёров в разговорные комнаты.

## REST endpoints

- `POST /api/match/join`
  ```json
  {
    "role": "USER", // or VOLUNTEER
    "displayName": "Надежда",
    "clientId": "web-55342572"
  }
  ```
  Returns `MatchResponse` with `status` `WAITING` or `CONNECTED`. Keep `participantId` to poll later.

- `GET /api/match/status/{participantId}`
  Poll to check when a waiting participant получил пару. Response содержит `roomId` и данные собеседника.

- `DELETE /api/match/leave/{participantId}`
  Удаляет участника из очереди, если пользователь закрыл экран.

## WebSocket

После получения `roomId`, обе стороны подключаются к `ws://<host>/ws/call?roomId=<roomId>`. Любые текстовые сообщения (SDP/ICE и т.д.) ретранслируются всем участникам комнаты.
