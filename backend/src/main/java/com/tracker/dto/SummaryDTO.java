package com.tracker.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SummaryDTO {

    private Integer totalSubmodules;
    private Integer total;
    private Integer pass;
    private Integer fail;
    private Integer onhold;
    private Integer pending;
    private Double passRate;
}
