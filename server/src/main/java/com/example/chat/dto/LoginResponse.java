package com.example.chat.dto;

public class LoginResponse {

    private final Long userId;
    private final String username;
    private final String displayName;

    public LoginResponse(Long userId, String username, String displayName) {
        this.userId = userId;
        this.username = username;
        this.displayName = displayName;
    }

    public Long getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getDisplayName() {
        return displayName;
    }
}
