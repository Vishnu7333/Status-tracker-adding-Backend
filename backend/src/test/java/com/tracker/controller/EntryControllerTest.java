package com.tracker.controller;

import com.tracker.dto.EntryRequestDTO;
import com.tracker.dto.EntryResponseDTO;
import com.tracker.dto.SummaryDTO;
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

import java.util.Collections;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EntryController.class)
class EntryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EntryService entryService;

    @MockBean
    private UserService userService;

    private User testUser;
    private EntryResponseDTO responseDTO;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .displayName("Test User")
                .role(Role.EMPLOYEE)
                .build();

        responseDTO = EntryResponseDTO.builder()
                .id(UUID.randomUUID())
                .userId(testUser.getId())
                .project("Proj")
                .module("Mod")
                .submodule("Sub")
                .total(10)
                .pass(10)
                .status("Pass")
                .build();

        org.mockito.Mockito.lenient()
                .when(userService.getOrCreateUser("test@example.com", "Test User"))
                .thenReturn(testUser);
    }

    @Test
    @WithMockUser
    void upsertEntry_WhenUserAuthenticated_ReturnsCreated() throws Exception {
        when(entryService.upsertEntry(any(User.class), any(EntryRequestDTO.class))).thenReturn(responseDTO);

        mockMvc.perform(post("/api/entries")
                        .with(csrf())
                        .header("X-User-Email", "test@example.com")
                        .header("X-User-Name", "Test User")
                        .requestAttr("currentUser", testUser)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"project\":\"Proj\",\"module\":\"Mod\",\"submodule\":\"Sub\",\"total\":10,\"pass\":10}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.submodule").value("Sub"));
    }

    @Test
    @WithMockUser
    void upsertEntry_WhenUserNotAuthenticated_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/entries")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"project\":\"Proj\",\"module\":\"Mod\",\"submodule\":\"Sub\",\"total\":10,\"pass\":10}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Unauthorized: Missing user authentication headers"));
    }

    @Test
    @WithMockUser
    void getMyEntries_WhenUserAuthenticated_ReturnsOk() throws Exception {
        when(entryService.getEntriesForUser(testUser.getId())).thenReturn(Collections.singletonList(responseDTO));

        mockMvc.perform(get("/api/entries/mine")
                        .header("X-User-Email", "test@example.com")
                        .header("X-User-Name", "Test User")
                        .requestAttr("currentUser", testUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].submodule").value("Sub"));
    }

    @Test
    @WithMockUser
    void getMyEntries_WhenUserNotAuthenticated_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/entries/mine"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser
    void getMySummary_WhenUserAuthenticated_ReturnsOk() throws Exception {
        SummaryDTO summary = SummaryDTO.builder().total(10).pass(10).passRate(100.0).build();
        when(entryService.getSummaryForUser(testUser.getId())).thenReturn(summary);

        mockMvc.perform(get("/api/entries/summary/mine")
                        .header("X-User-Email", "test@example.com")
                        .header("X-User-Name", "Test User")
                        .requestAttr("currentUser", testUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.passRate").value(100.0));
    }

    @Test
    @WithMockUser
    void deleteEntry_WhenUserAuthenticated_ReturnsOk() throws Exception {
        UUID entryId = UUID.randomUUID();
        doNothing().when(entryService).deleteEntry(eq(entryId), eq(testUser.getId()), eq(testUser.getRole()));

        mockMvc.perform(delete("/api/entries/" + entryId)
                        .with(csrf())
                        .header("X-User-Email", "test@example.com")
                        .header("X-User-Name", "Test User")
                        .requestAttr("currentUser", testUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
