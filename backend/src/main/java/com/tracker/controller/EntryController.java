package com.tracker.controller;

import com.tracker.dto.ApiResponse;
import com.tracker.dto.EntryRequestDTO;
import com.tracker.dto.EntryResponseDTO;
import com.tracker.dto.SummaryDTO;
import com.tracker.entity.User;
import com.tracker.service.EntryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/entries")
@RequiredArgsConstructor
public class EntryController {

    private final EntryService entryService;

    @PostMapping
    public ResponseEntity<ApiResponse<EntryResponseDTO>> upsertEntry(
            HttpServletRequest request,
            @Valid @RequestBody EntryRequestDTO dto) {
        
        User user = (User) request.getAttribute("currentUser");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized: Missing user authentication headers"));
        }

        EntryResponseDTO response = entryService.upsertEntry(user, dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<EntryResponseDTO>>> getMyEntries(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized: Missing user authentication headers"));
        }

        List<EntryResponseDTO> entries = entryService.getEntriesForUser(user.getId());
        return ResponseEntity.ok(ApiResponse.ok(entries));
    }

    @GetMapping("/summary/mine")
    public ResponseEntity<ApiResponse<SummaryDTO>> getMySummary(HttpServletRequest request) {
        User user = (User) request.getAttribute("currentUser");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized: Missing user authentication headers"));
        }

        SummaryDTO summary = entryService.getSummaryForUser(user.getId());
        return ResponseEntity.ok(ApiResponse.ok(summary));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEntry(
            HttpServletRequest request,
            @PathVariable UUID id) {
        
        User user = (User) request.getAttribute("currentUser");
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Unauthorized: Missing user authentication headers"));
        }

        entryService.deleteEntry(id, user.getId());
        return ResponseEntity.ok(ApiResponse.ok("Entry deleted successfully", null));
    }
}
