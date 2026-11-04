package com.issuepilot.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties properties;

    public WebConfig(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    @SuppressWarnings("null")
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        String frontendUrl = properties.getFrontendAppUrl();
        java.util.List<String> origins = new java.util.ArrayList<>();
        if (frontendUrl != null && !frontendUrl.isBlank()) {
            origins.add(frontendUrl.trim());
        }
        origins.add("http://localhost:3000");
        origins.add("http://localhost:5173");
        origins.add("http://127.0.0.1:3000");
        origins.add("http://127.0.0.1:5173");

        String configured = properties.getCorsOrigins();
        if (configured != null && !configured.isBlank() && !configured.equals("*")) {
            for (String o : configured.split(",")) {
                if (!o.isBlank() && !origins.contains(o.trim())) {
                    origins.add(o.trim());
                }
            }
        }

        registry.addMapping("/**")
                .allowedOriginPatterns(origins.toArray(new String[0]))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");
    }

    @Override
    public void addViewControllers(@NonNull ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/static/index.html");
        registry.addViewController("/demo").setViewName("forward:/static/index.html");
    }
}
