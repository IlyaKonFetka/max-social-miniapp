package ru.chousik.backend_calls.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.chousik.backend_calls.dto.JoinQueueRequest;
import ru.chousik.backend_calls.dto.MatchResponse;
import ru.chousik.backend_calls.dto.PollStatusResponse;
import ru.chousik.backend_calls.service.match.MatchService;

@RestController
@RequestMapping("/api/match")
@CrossOrigin(origins = "*")
public class MatchController {

    private final MatchService matchService;

    public MatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    @PostMapping("/join")
    public ResponseEntity<MatchResponse> join(@Valid @RequestBody JoinQueueRequest request) {
        return ResponseEntity.ok(matchService.joinQueue(request));
    }

    @GetMapping("/status/{participantId}")
    public ResponseEntity<PollStatusResponse> status(@PathVariable String participantId) {
        return ResponseEntity.ok(matchService.pollStatus(participantId));
    }

    @DeleteMapping("/leave/{participantId}")
    public ResponseEntity<Void> leave(@PathVariable String participantId) {
        matchService.leaveQueue(participantId);
        return ResponseEntity.noContent().build();
    }
}
