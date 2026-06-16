package com.tracker.controller;

import com.tracker.dto.ApiResponse;
import com.tracker.dto.EntryResponseDTO;
import com.tracker.dto.SummaryDTO;
import com.tracker.dto.UserResponseDTO;
import com.tracker.dto.UserSummaryDTO;
import com.tracker.entity.Role;
import com.tracker.entity.User;
import com.tracker.service.EntryService;
import com.tracker.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final EntryService entryService;
    private final UserService userService;

    private void validateAdmin(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized: Missing user authentication headers");
        }
        if (user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden: Only administrators can access this resource");
        }
    }

    @GetMapping("/entries")
    public ResponseEntity<ApiResponse<List<EntryResponseDTO>>> getAllEntries(HttpServletRequest request) {
        validateAdmin(request);
        List<EntryResponseDTO> entries = entryService.getAllEntries();
        return ResponseEntity.ok(ApiResponse.ok(entries));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<SummaryDTO>> getOverallSummary(HttpServletRequest request) {
        validateAdmin(request);
        SummaryDTO summary = entryService.getOverallSummary();
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserResponseDTO>>> getAllUsers(HttpServletRequest request) {
        validateAdmin(request);
        List<UserResponseDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @GetMapping("/summary/per-user")
    public ResponseEntity<ApiResponse<List<UserSummaryDTO>>> getPerUserSummary(HttpServletRequest request) {
        validateAdmin(request);
        List<UserSummaryDTO> summaryList = entryService.getPerUserSummary();
        return ResponseEntity.ok(ApiResponse.ok(summaryList));
    }

    @PutMapping("/users/{userId}/role")
    public ResponseEntity<ApiResponse<UserResponseDTO>> updateRole(
            HttpServletRequest request,
            @PathVariable UUID userId,
            @RequestBody RoleUpdateRequest roleUpdateRequest) {
        
        validateAdmin(request);
        User updatedUser = userService.updateRole(userId, roleUpdateRequest.getRole());
        
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
