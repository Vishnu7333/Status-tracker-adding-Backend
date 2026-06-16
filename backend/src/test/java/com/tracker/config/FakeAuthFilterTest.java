package com.tracker.config;

import com.tracker.entity.Role;
import com.tracker.entity.User;
import com.tracker.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FakeAuthFilterTest {

    @Mock
    private UserService userService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private FakeAuthFilter fakeAuthFilter;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .email("test@example.com")
                .displayName("Test User")
                .role(Role.EMPLOYEE)
                .build();
    }

    @Test
    void doFilterInternal_WhenHeadersArePresent_SetsCurrentUserAttribute() throws ServletException, IOException {
        when(request.getHeader("X-User-Email")).thenReturn("test@example.com");
        when(request.getHeader("X-User-Name")).thenReturn("Test User");
        when(userService.getOrCreateUser("test@example.com", "Test User")).thenReturn(testUser);

        fakeAuthFilter.doFilterInternal(request, response, filterChain);

        verify(request, times(1)).setAttribute("currentUser", testUser);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    void doFilterInternal_WhenEmailOnlyIsPresent_ExtractsNameAndSetsCurrentUserAttribute() throws ServletException, IOException {
        when(request.getHeader("X-User-Email")).thenReturn("vishnu.kumar@oracle.com");
        when(request.getHeader("X-User-Name")).thenReturn(null);
        
        User vishnuUser = User.builder()
                .email("vishnu.kumar@oracle.com")
                .displayName("Vishnu Kumar")
                .role(Role.ADMIN)
                .build();
        when(userService.getOrCreateUser("vishnu.kumar@oracle.com", "Vishnu Kumar")).thenReturn(vishnuUser);

        fakeAuthFilter.doFilterInternal(request, response, filterChain);

        verify(request, times(1)).setAttribute("currentUser", vishnuUser);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    void doFilterInternal_WhenHeadersAreMissing_SetsCurrentUserToNull() throws ServletException, IOException {
        when(request.getHeader("X-User-Email")).thenReturn(null);
        when(request.getHeader("X-User-Name")).thenReturn(null);

        fakeAuthFilter.doFilterInternal(request, response, filterChain);

        verify(request, times(1)).setAttribute("currentUser", null);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    void currentUserUtil_GetUser_WhenAttributeIsPresent_ReturnsUser() {
        when(request.getAttribute("currentUser")).thenReturn(testUser);

        User result = CurrentUserUtil.getUser(request);

        assertNotNull(result);
        assertEquals("test@example.com", result.getEmail());
    }

    @Test
    void currentUserUtil_GetUser_WhenAttributeIsMissing_ThrowsRuntimeException() {
        when(request.getAttribute("currentUser")).thenReturn(null);

        assertThrows(RuntimeException.class, () -> {
            CurrentUserUtil.getUser(request);
        });
    }
}
