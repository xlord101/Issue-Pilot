package com.issuepilot.adapter;

public class TransientAPIException extends SourceAPIException {
    private static final long serialVersionUID = 1L;
    public TransientAPIException(String message) {
        super(message);
    }
    public TransientAPIException(String message, Integer statusCode) {
        super(message, statusCode);
    }
}
