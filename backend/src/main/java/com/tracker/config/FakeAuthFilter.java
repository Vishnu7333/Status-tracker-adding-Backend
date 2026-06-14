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

        if (email != null && !email.trim().isEmpty() && name != null && !name.trim().isEmpty()) {
            User user = userService.getOrCreateUser(email, name);
            request.setAttribute("currentUser", user);
        } else {
            request.setAttribute("currentUser", null);
        }

        filterChain.doFilter(request, response);
    }
}
