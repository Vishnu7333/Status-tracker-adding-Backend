package com.tracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntryResponseDTO {

    private UUID id;
    private UUID userId;
    private String displayName;
    private String email;
    private String project;
    private String module;
    private String submodule;
    private Integer total;
    private Integer pass;
    private Integer fail;
    private Integer onhold;
    private Integer pending;
    private String status;
    private String comments;
    private LocalDate entryDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
