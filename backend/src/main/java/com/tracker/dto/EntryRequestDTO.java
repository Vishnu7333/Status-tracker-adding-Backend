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

    private String comments;
}
