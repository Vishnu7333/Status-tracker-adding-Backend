package com.tracker.controller;

import com.tracker.dto.ApiResponse;
import com.tracker.dto.EntryResponseDTO;
import com.tracker.dto.SummaryDTO;
import com.tracker.dto.UserResponseDTO;
import com.tracker.dto.UserSummaryDTO;
import com.tracker.entity.User;
import com.tracker.service.EntryService;
import com.tracker.service.UserService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final EntryService entryService;
    private final UserService userService;

    @GetMapping("/entries")
    public ResponseEntity<ApiResponse<List<EntryResponseDTO>>> getAllEntries() {
        List<EntryResponseDTO> entries = entryService.getAllEntries();
        return ResponseEntity.ok(ApiResponse.ok(entries));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<SummaryDTO>> getOverallSummary() {
        SummaryDTO summary = entryService.getOverallSummary();
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponseDTO>>> getAllUsers() {
        List<UserResponseDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @GetMapping("/summary/per-user")
    public ResponseEntity<ApiResponse<List<UserSummaryDTO>>> getPerUserSummary() {
        List<UserSummaryDTO> summaryList = entryService.getPerUserSummary();
        return ResponseEntity.ok(ApiResponse.ok(summaryList));
    }

    @PutMapping("/users/{userId}/role")
    public ResponseEntity<ApiResponse<UserResponseDTO>> updateRole(
            @PathVariable UUID userId,
            @RequestBody RoleUpdateRequest request) {
        
        User updatedUser = userService.updateRole(userId, request.getRole());
        
        UserResponseDTO response = UserResponseDTO.builder()
                .id(updatedUser.getId())
                .email(updatedUser.getEmail())
                .displayName(updatedUser.getDisplayName())
                .role(updatedUser.getRole().name())
                .createdAt(updatedUser.getCreatedAt())
                .build();
                
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Data
    public static class RoleUpdateRequest {
        private String role;
    }
}
