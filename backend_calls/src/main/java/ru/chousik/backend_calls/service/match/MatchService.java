package ru.chousik.backend_calls.service.match;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import ru.chousik.backend_calls.dto.JoinQueueRequest;
import ru.chousik.backend_calls.dto.MatchResponse;
import ru.chousik.backend_calls.dto.MatchStatus;
import ru.chousik.backend_calls.dto.PollStatusResponse;
import ru.chousik.backend_calls.model.ParticipantRole;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Map;
import java.util.Optional;
import java.util.Queue;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MatchService {

    private static final Logger log = LoggerFactory.getLogger(MatchService.class);
    private static final Duration EXPIRATION = Duration.ofMinutes(5);

    private final Queue<Participant> waitingUsers = new ArrayDeque<>();
    private final Queue<Participant> waitingVolunteers = new ArrayDeque<>();
    private final Map<String, MatchResponse> activeMatches = new ConcurrentHashMap<>();

    public synchronized MatchResponse joinQueue(JoinQueueRequest request) {
        cleanupExpired();

        Participant participant = new Participant(
                UUID.randomUUID().toString(),
                request.role(),
                request.displayName(),
                request.clientId()
        );

        Optional<Participant> match = findCounterpart(participant.role());
        if (match.isPresent()) {
            Participant counterpart = match.get();
            String roomId = UUID.randomUUID().toString();

            MatchResponse.PartnerInfo partnerForCurrent = new MatchResponse.PartnerInfo(
                    counterpart.displayName(), counterpart.clientId()
            );
            MatchResponse.PartnerInfo partnerForCounterpart = new MatchResponse.PartnerInfo(
                    participant.displayName(), participant.clientId()
            );

            MatchResponse currentResponse = new MatchResponse(
                    MatchStatus.CONNECTED,
                    participant.participantId(),
                    roomId,
                    partnerForCurrent
            );

            MatchResponse counterpartResponse = new MatchResponse(
                    MatchStatus.CONNECTED,
                    counterpart.participantId(),
                    roomId,
                    partnerForCounterpart
            );

            activeMatches.put(participant.participantId(), currentResponse);
            activeMatches.put(counterpart.participantId(), counterpartResponse);

            log.info("Matched {} with {} in room {}", participant.role(), counterpart.role(), roomId);
            return currentResponse;
        }

        getQueue(participant.role()).add(participant);
        MatchResponse waitResponse = new MatchResponse(
                MatchStatus.WAITING,
                participant.participantId(),
                null,
                null
        );
        activeMatches.put(participant.participantId(), waitResponse);
        log.info("Participant {} queued as {}", participant.participantId(), participant.role());
        return waitResponse;
    }

    public synchronized PollStatusResponse pollStatus(String participantId) {
        cleanupExpired();
        MatchResponse response = activeMatches.get(participantId);
        if (response == null) {
            return new PollStatusResponse(MatchStatus.WAITING, null, null);
        }

        return new PollStatusResponse(response.status(), response.roomId(), response.partner());
    }

    public synchronized void leaveQueue(String participantId) {
        cleanupExpired();
        activeMatches.remove(participantId);
        waitingUsers.removeIf(p -> p.participantId().equals(participantId));
        waitingVolunteers.removeIf(p -> p.participantId().equals(participantId));
    }

    private Optional<Participant> findCounterpart(ParticipantRole role) {
        Queue<Participant> queue = role == ParticipantRole.USER ? waitingVolunteers : waitingUsers;
        Participant candidate = queue.poll();
        if (candidate == null) {
            return Optional.empty();
        }
        return Optional.of(candidate);
    }

    private Queue<Participant> getQueue(ParticipantRole role) {
        return role == ParticipantRole.USER ? waitingUsers : waitingVolunteers;
    }

    private void cleanupExpired() {
        Instant threshold = Instant.now().minus(EXPIRATION);
        waitingUsers.removeIf(p -> p.createdAt().isBefore(threshold));
        waitingVolunteers.removeIf(p -> p.createdAt().isBefore(threshold));
    }
}
