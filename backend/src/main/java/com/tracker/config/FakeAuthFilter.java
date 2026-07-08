package com.tracker.config;

import com.tracker.entity.User;
import com.tracker.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class FakeAuthFilter extends OncePerRequestFilter {

    private final UserService userService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String email = request.getHeader("X-User-Email");
        String name = request.getHeader("X-User-Name");

        if (email != null && !email.trim().isEmpty()) {
            if (name == null || name.trim().isEmpty()) {
                name = extractNameFromEmail(email);
            }
            User user = userService.getOrCreateUser(email, name);
            if ("INACTIVE".equalsIgnoreCase(user.getStatus())) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "User account is inactive");
                return;
            }
            request.setAttribute("currentUser", user);
        } else {
            if (request.getAttribute("currentUser") == null) {
                request.setAttribute("currentUser", null);
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractNameFromEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return "";
        }
        String prefix = email.split("@")[0];
        String[] parts = prefix.split("[._-]");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (!part.isEmpty()) {
                sb.append(Character.toUpperCase(part.charAt(0)))
                  .append(part.substring(1).toLowerCase())
                  .append(" ");
            }
        }
        return sb.toString().trim();
    }
}
