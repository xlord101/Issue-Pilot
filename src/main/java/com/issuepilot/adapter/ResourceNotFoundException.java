package com.issuepilot.adapter;

public class ResourceNotFoundException extends SourceAPIException {
    private static final long serialVersionUID = 1L;
    public ResourceNotFoundException(String message) {
        super(message, 404);
    }
}
