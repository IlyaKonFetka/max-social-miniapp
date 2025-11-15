package ru.chousik.backend_calls.controller;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.chousik.backend_calls.dto.WebAppAuthRequest;
import ru.chousik.backend_calls.dto.WebAppAuthResponse;
import ru.chousik.backend_calls.service.MaxAuthService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final MaxAuthService maxAuthService;

    public AuthController(MaxAuthService maxAuthService) {
        this.maxAuthService = maxAuthService;
    }

    @PostMapping("/max")
    public ResponseEntity<WebAppAuthResponse> authenticate(@Valid @RequestBody WebAppAuthRequest request) {
        return ResponseEntity.ok(maxAuthService.authenticate(request));
    }
}
