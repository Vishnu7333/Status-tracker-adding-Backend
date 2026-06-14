package com.tracker.controller;

import com.tracker.dto.EntryResponseDTO;
import com.tracker.dto.SummaryDTO;
import com.tracker.dto.UserResponseDTO;
import com.tracker.dto.UserSummaryDTO;
import com.tracker.entity.Role;
import com.tracker.entity.User;
import com.tracker.service.EntryService;
import com.tracker.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EntryService entryService;

    @MockBean
    private UserService userService;

    private UserResponseDTO userResponseDTO;
    private EntryResponseDTO entryResponseDTO;

    @BeforeEach
    void setUp() {
        userResponseDTO = UserResponseDTO.builder()
                .id(UUID.randomUUID())
                .email("admin@example.com")
                .displayName("Admin User")
                .role("ADMIN")
                .createdAt(LocalDateTime.now())
                .build();

        entryResponseDTO = EntryResponseDTO.builder()
                .id(UUID.randomUUID())
                .userId(userResponseDTO.getId())
                .project("AdminProj")
                .module("AdminMod")
                .submodule("AdminSub")
                .total(5)
                .pass(5)
                .status("Pass")
                .build();
    }

    @Test
    @WithMockUser
    void getAllEntries_ReturnsOk() throws Exception {
        when(entryService.getAllEntries()).thenReturn(Collections.singletonList(entryResponseDTO));

        mockMvc.perform(get("/api/admin/entries"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].project").value("AdminProj"));
    }

    @Test
    @WithMockUser
    void getOverallSummary_ReturnsOk() throws Exception {
        SummaryDTO summary = SummaryDTO.builder().total(5).pass(5).passRate(100.0).build();
        when(entryService.getOverallSummary()).thenReturn(summary);

        mockMvc.perform(get("/api/admin/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.passRate").value(100.0));
    }

    @Test
    @WithMockUser
    void getAllUsers_ReturnsOk() throws Exception {
        when(userService.getAllUsers()).thenReturn(Collections.singletonList(userResponseDTO));

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].email").value("admin@example.com"));
    }

    @Test
    @WithMockUser
    void getPerUserSummary_ReturnsOk() throws Exception {
        SummaryDTO summary = SummaryDTO.builder().total(5).pass(5).passRate(100.0).build();
        UserSummaryDTO userSummary = UserSummaryDTO.builder()
                .user(userResponseDTO)
                .summary(summary)
                .lastActive(LocalDate.now())
                .build();

        when(entryService.getPerUserSummary()).thenReturn(Collections.singletonList(userSummary));

        mockMvc.perform(get("/api/admin/summary/per-user"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].user.email").value("admin@example.com"))
                .andExpect(jsonPath("$.data[0].summary.passRate").value(100.0));
    }

    @Test
    @WithMockUser
    void updateRole_ReturnsOk() throws Exception {
        UUID targetUserId = UUID.randomUUID();
        User updatedUser = User.builder()
                .id(targetUserId)
                .email("user@example.com")
                .displayName("Some User")
                .role(Role.ADMIN)
                .createdAt(LocalDateTime.now())
                .build();

        when(userService.updateRole(eq(targetUserId), eq("ADMIN"))).thenReturn(updatedUser);

        mockMvc.perform(put("/api/admin/users/" + targetUserId + "/role")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.role").value("ADMIN"))
                .andExpect(jsonPath("$.data.email").value("user@example.com"));
    }
}
