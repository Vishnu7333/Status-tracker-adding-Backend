package com.tracker.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntryRequestDTO {

    @NotBlank
    @jakarta.validation.constraints.Pattern(
        regexp = "^(?=.*[a-zA-Z])[a-zA-Z .-]+$",
        message = "Customer Name must contain at least one letter and can only include letters, spaces, dots, and hyphens"
    )
    private String project;

    @NotBlank
    private String module;

    @NotBlank
    private String submodule;

    @NotNull
    @Min(0)
    private Integer total;

    @Min(0)
    private Integer pass;

    @Min(0)
    private Integer fail;

    @Min(0)
    private Integer onhold;

    @Min(0)
    private Integer pending;

    @Min(0)
    private Integer na;

    @Min(0)
    private Integer functionalTeam;

    private String comments;
}
