package com.tracker.controller;

import com.tracker.entity.Role;
import com.tracker.entity.User;
import com.tracker.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .displayName("Test User")
                .role(Role.EMPLOYEE)
                .build();

        org.mockito.Mockito.lenient()
                .when(userService.getOrCreateUser("test@example.com", "Test User"))
                .thenReturn(testUser);
    }

    @Test
    @WithMockUser
    void getCurrentUser_WhenAuthenticated_ReturnsOk() throws Exception {
        mockMvc.perform(get("/api/users/me")
                        .header("X-User-Email", "test@example.com")
                        .header("X-User-Name", "Test User")
                        .requestAttr("currentUser", testUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("test@example.com"))
                .andExpect(jsonPath("$.data.role").value("EMPLOYEE"));
    }

    @Test
    @WithMockUser
    void getCurrentUser_WhenNotAuthenticated_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Unauthorized: Missing user authentication headers"));
    }

    @Test
    @WithMockUser
    void lookupUser_WhenUserExists_ReturnsUser() throws Exception {
        org.mockito.Mockito.when(userService.findByEmail("test@example.com")).thenReturn(testUser);

        mockMvc.perform(get("/api/users/lookup")
                        .param("email", "test@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("test@example.com"))
                .andExpect(jsonPath("$.data.role").value("EMPLOYEE"));
    }

    @Test
    @WithMockUser
    void lookupUser_WhenUserDoesNotExist_ReturnsNull() throws Exception {
        org.mockito.Mockito.when(userService.findByEmail("missing@example.com")).thenReturn(null);

        mockMvc.perform(get("/api/users/lookup")
                        .param("email", "missing@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.nullValue()));
    }
}
