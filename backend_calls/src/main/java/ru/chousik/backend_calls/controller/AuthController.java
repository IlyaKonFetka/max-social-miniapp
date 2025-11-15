package ru.chousik.backend_calls.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.chousik.backend_calls.dto.WebAppAuthRequest;
import ru.chousik.backend_calls.dto.WebAppAuthResponse;
import ru.chousik.backend_calls.service.TelegramAuthService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final TelegramAuthService telegramAuthService;

    public AuthController(TelegramAuthService telegramAuthService) {
        this.telegramAuthService = telegramAuthService;
    }

    @PostMapping("/telegram")
    public ResponseEntity<WebAppAuthResponse> authenticate(@Valid @RequestBody WebAppAuthRequest request) {
        return ResponseEntity.ok(telegramAuthService.authenticate(request));
    }
}
