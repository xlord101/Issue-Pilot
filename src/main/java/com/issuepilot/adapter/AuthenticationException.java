package com.issuepilot.adapter;

public class AuthenticationException extends SourceAPIException {
    private static final long serialVersionUID = 1L;
    public AuthenticationException(String message) {
        super(message, 401);
    }
    public AuthenticationException(String message, Integer statusCode) {
        super(message, statusCode);
    }
}
