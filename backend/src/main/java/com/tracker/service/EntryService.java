package com.tracker.service;

import com.tracker.dto.EntryRequestDTO;
import com.tracker.dto.EntryResponseDTO;
import com.tracker.dto.SummaryDTO;
import com.tracker.dto.UserResponseDTO;
import com.tracker.dto.UserSummaryDTO;
import com.tracker.entity.Entry;
import com.tracker.entity.User;
import com.tracker.repository.EntryRepository;
import com.tracker.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EntryService {

    private final EntryRepository entryRepository;
    private final UserRepository userRepository;

    @Transactional
    public EntryResponseDTO upsertEntry(User user, EntryRequestDTO dto) {
        int passVal = dto.getPass() != null ? dto.getPass() : 0;
        int failVal = dto.getFail() != null ? dto.getFail() : 0;
        int onholdVal = dto.getOnhold() != null ? dto.getOnhold() : 0;
        int pendingVal = dto.getPending() != null ? dto.getPending() : 0;
        int totalVal = dto.getTotal() != null ? dto.getTotal() : (passVal + failVal + onholdVal + pendingVal);

        String calculatedStatus = calculateStatus(totalVal, passVal, failVal, onholdVal, pendingVal);

        Optional<Entry> existingEntryOpt = entryRepository.findByUserIdAndModuleAndSubmoduleAndEntryDate(
                user.getId(), dto.getModule(), dto.getSubmodule(), LocalDate.now()
        );

        Entry entryToSave;
        if (existingEntryOpt.isPresent()) {
            Entry existing = existingEntryOpt.get();

            int currentPass = existing.getPass() != null ? existing.getPass() : 0;
            int currentFail = existing.getFail() != null ? existing.getFail() : 0;
            int currentOnhold = existing.getOnhold() != null ? existing.getOnhold() : 0;
            int currentPending = existing.getPending() != null ? existing.getPending() : 0;

            existing.setPass(currentPass + passVal);
            existing.setFail(currentFail + failVal);
            existing.setOnhold(currentOnhold + onholdVal);
            existing.setPending(currentPending + pendingVal);

            int newTotal = existing.getPass() + existing.getFail() + existing.getOnhold() + existing.getPending();
            existing.setTotal(newTotal);

            existing.setStatus(calculateStatus(newTotal, existing.getPass(), existing.getFail(), existing.getOnhold(), existing.getPending()));

            String existingComment = existing.getComments();
            String newComment = dto.getComments();
            if (existingComment != null && !existingComment.trim().isEmpty() && newComment != null && !newComment.trim().isEmpty()) {
                existing.setComments(existingComment + " | " + newComment);
            } else if (newComment != null && !newComment.trim().isEmpty()) {
                existing.setComments(newComment);
            }

            existing.setUpdatedAt(LocalDateTime.now());
            entryToSave = existing;
        } else {
            entryToSave = Entry.builder()
                    .user(user)
                    .project(dto.getProject())
                    .module(dto.getModule())
                    .submodule(dto.getSubmodule())
                    .pass(passVal)
                    .fail(failVal)
                    .onhold(onholdVal)
                    .pending(pendingVal)
                    .total(totalVal)
                    .status(calculatedStatus)
                    .comments(dto.getComments())
                    .entryDate(LocalDate.now())
                    .build();
        }

        Entry saved = entryRepository.save(entryToSave);
        return mapToDTO(saved);
    }

    @Transactional(readOnly = true)
    public List<EntryResponseDTO> getEntriesForUser(UUID userId) {
        return entryRepository.findByUserIdOrderByEntryDateDesc(userId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EntryResponseDTO> getAllEntries() {
        return entryRepository.findAllByOrderByEntryDateDesc().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteEntry(UUID entryId, UUID userId) {
        Entry entry = entryRepository.findById(entryId)
                .orElseThrow(() -> new RuntimeException("Entry not found"));
        if (!entry.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized: Entry does not belong to this user");
        }
        entryRepository.delete(entry);
    }

    @Transactional(readOnly = true)
    public SummaryDTO getSummaryForUser(UUID userId) {
        List<Entry> entries = entryRepository.findByUserId(userId);
        return aggregateEntries(entries);
    }

    @Transactional(readOnly = true)
    public SummaryDTO getOverallSummary() {
        List<Entry> entries = entryRepository.findAll();
        return aggregateEntries(entries);
    }

    @Transactional(readOnly = true)
    public List<UserSummaryDTO> getPerUserSummary() {
        return userRepository.findAll().stream()
                .map(user -> {
                    List<Entry> userEntries = entryRepository.findByUserId(user.getId());
                    SummaryDTO summary = aggregateEntries(userEntries);

                    LocalDate lastActive = userEntries.stream()
                            .map(Entry::getEntryDate)
                            .filter(Objects::nonNull)
                            .max(LocalDate::compareTo)
                            .orElse(null);

                    UserResponseDTO userDTO = UserResponseDTO.builder()
                            .id(user.getId())
                            .email(user.getEmail())
                            .displayName(user.getDisplayName())
                            .role(user.getRole().name())
                            .createdAt(user.getCreatedAt())
                            .build();

                    return UserSummaryDTO.builder()
                            .user(userDTO)
                            .summary(summary)
                            .lastActive(lastActive)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private SummaryDTO aggregateEntries(List<Entry> entries) {
        int totalSubmodules = entries.size();
        int sumTotal = 0;
        int sumPass = 0;
        int sumFail = 0;
        int sumOnhold = 0;
        int sumPending = 0;

        for (Entry entry : entries) {
            sumTotal += entry.getTotal() != null ? entry.getTotal() : 0;
            sumPass += entry.getPass() != null ? entry.getPass() : 0;
            sumFail += entry.getFail() != null ? entry.getFail() : 0;
            sumOnhold += entry.getOnhold() != null ? entry.getOnhold() : 0;
            sumPending += entry.getPending() != null ? entry.getPending() : 0;
        }

        double passRate = sumTotal > 0 ? ((double) sumPass / sumTotal) * 100.0 : 0.0;

        return SummaryDTO.builder()
                .totalSubmodules(totalSubmodules)
                .total(sumTotal)
                .pass(sumPass)
                .fail(sumFail)
                .onhold(sumOnhold)
                .pending(sumPending)
                .passRate(passRate)
                .build();
    }

    private String calculateStatus(int total, int pass, int fail, int onhold, int pending) {
        if (total > 0 && pass == total) {
            return "Pass";
        } else if (pending > 0 && (pass > 0 || fail > 0)) {
            return "Inprogress";
        } else if (fail > 0) {
            return "Fail";
        } else if (onhold > 0) {
            return "On Hold";
        } else if (pending > 0) {
            return "Pending";
        } else {
            return "Pending";
        }
    }

    private EntryResponseDTO mapToDTO(Entry entry) {
        UUID userId = null;
        String displayName = null;
        String email = null;

        if (entry.getUser() != null) {
            userId = entry.getUser().getId();
            displayName = entry.getUser().getDisplayName();
            email = entry.getUser().getEmail();
        }

        return EntryResponseDTO.builder()
                .id(entry.getId())
                .userId(userId)
                .displayName(displayName)
                .email(email)
                .project(entry.getProject())
                .module(entry.getModule())
                .submodule(entry.getSubmodule())
                .total(entry.getTotal())
                .pass(entry.getPass())
                .fail(entry.getFail())
                .onhold(entry.getOnhold())
                .pending(entry.getPending())
                .status(entry.getStatus())
                .comments(entry.getComments())
                .entryDate(entry.getEntryDate())
                .createdAt(entry.getCreatedAt())
                .updatedAt(entry.getUpdatedAt())
                .build();
    }
}
