package com.tracker.repository;

import com.tracker.entity.Entry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EntryRepository extends JpaRepository<Entry, UUID> {

    List<Entry> findByUserIdOrderByEntryDateDesc(UUID userId);

    Optional<Entry> findByUserIdAndProjectAndModuleAndSubmoduleAndEntryDate(UUID userId, String project, String module, String submodule, LocalDate date);

    Optional<Entry> findByUserIdAndProjectAndModuleAndSubmodule(UUID userId, String project, String module, String submodule);

    List<Entry> findAllByOrderByEntryDateDesc();

    List<Entry> findByUserId(UUID userId);

    List<Entry> findByProjectIgnoreCase(String project);
}
