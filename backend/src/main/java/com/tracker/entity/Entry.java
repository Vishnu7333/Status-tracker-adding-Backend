package com.tracker.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Entry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String project;

    @Column(nullable = false)
    private String module;

    @Column(nullable = false)
    private String submodule;

    @Column(nullable = false)
    private Integer total;

    @Builder.Default
    @Column(nullable = false)
    private Integer pass = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer fail = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer onhold = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer pending = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer na = 0;

    @Builder.Default
    @Column(name = "functional_team", nullable = false)
    private Integer functionalTeam = 0;

    private String status;

    private String comments;

    @Column(nullable = false)
    private LocalDate entryDate;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
