package com.issuepilot.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC configuration. CORS is centrally configured in {@code SecurityConfig}
 * so security filters and MVC share a single authoritative policy.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
}
