package com.example.chat.controller;

import com.example.chat.dto.LoginRequest;
import com.example.chat.dto.LoginResponse;
import com.example.chat.dto.RegisterRequest;
import com.example.chat.model.ChatUser;
import com.example.chat.service.ChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final ChatService chatService;

    public AuthController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        ChatUser user = chatService.authenticate(request.getUserId(), request.getPassword());
        return ResponseEntity.ok(toResponse(user));
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> register(@RequestBody RegisterRequest request) {
        ChatUser user = chatService.registerUser(request.getUserId(), request.getPassword(), request.getDisplayName());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(user));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException ex) {
        log.debug("Authentication error: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(ex.getMessage());
    }

    private LoginResponse toResponse(ChatUser user) {
        return new LoginResponse(user.getId(), user.getUsername(), user.getDisplayName());
    }
}
