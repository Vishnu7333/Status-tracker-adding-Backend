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
        int naVal = dto.getNa() != null ? dto.getNa() : 0;
        int functionalTeamVal = dto.getFunctionalTeam() != null ? dto.getFunctionalTeam() : 0;

        int pendingVal;
        if (dto.getTotal() != null) {
            pendingVal = dto.getTotal() - passVal - failVal - onholdVal - naVal - functionalTeamVal;
            if (pendingVal < 0) {
                pendingVal = 0;
            }
        } else {
            pendingVal = dto.getPending() != null ? dto.getPending() : 0;
        }

        int totalVal = dto.getTotal() != null ? dto.getTotal() : (passVal + failVal + onholdVal + pendingVal + naVal + functionalTeamVal);

        String calculatedStatus = calculateStatus(totalVal, passVal, failVal, onholdVal, pendingVal, naVal, functionalTeamVal);

        Optional<Entry> existingEntryOpt = entryRepository.findByUserIdAndProjectAndModuleAndSubmodule(
                user.getId(), dto.getProject(), dto.getModule(), dto.getSubmodule()
        );

        Entry entryToSave;
        if (existingEntryOpt.isPresent()) {
            Entry existing = existingEntryOpt.get();
            if (passVal < existing.getPass()) {
                throw new RuntimeException("Pass count cannot be less than the previously saved count (" + existing.getPass() + ").");
            }

            existing.setPass(passVal);
            existing.setFail(failVal);
            existing.setOnhold(onholdVal);
            existing.setPending(pendingVal);
            existing.setNa(naVal);
            existing.setFunctionalTeam(functionalTeamVal);
            existing.setTotal(totalVal);
            existing.setStatus(calculatedStatus);
            existing.setComments(dto.getComments());
            existing.setEntryDate(dto.getEntryDate() != null ? dto.getEntryDate() : LocalDate.now());

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
                    .na(naVal)
                    .functionalTeam(functionalTeamVal)
                    .total(totalVal)
                    .status(calculatedStatus)
                    .comments(dto.getComments())
                    .entryDate(dto.getEntryDate() != null ? dto.getEntryDate() : LocalDate.now())
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
        int sumNa = 0;
        int sumFunctionalTeam = 0;

        for (Entry entry : entries) {
            sumTotal += entry.getTotal() != null ? entry.getTotal() : 0;
            sumPass += entry.getPass() != null ? entry.getPass() : 0;
            sumFail += entry.getFail() != null ? entry.getFail() : 0;
            sumOnhold += entry.getOnhold() != null ? entry.getOnhold() : 0;
            sumPending += entry.getPending() != null ? entry.getPending() : 0;
            sumNa += entry.getNa() != null ? entry.getNa() : 0;
            sumFunctionalTeam += entry.getFunctionalTeam() != null ? entry.getFunctionalTeam() : 0;
        }

        double passRate = sumTotal > 0 ? ((double) sumPass / sumTotal) * 100.0 : 0.0;

        return SummaryDTO.builder()
                .totalSubmodules(totalSubmodules)
                .total(sumTotal)
                .pass(sumPass)
                .fail(sumFail)
                .onhold(sumOnhold)
                .pending(sumPending)
                .na(sumNa)
                .functionalTeam(sumFunctionalTeam)
                .passRate(passRate)
                .build();
    }

    private String calculateStatus(int total, int pass, int fail, int onhold, int pending, int na, int functionalTeam) {
        if (total > 0 && (pass + na + functionalTeam) == total) {
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
                .na(entry.getNa())
                .functionalTeam(entry.getFunctionalTeam())
                .status(entry.getStatus())
                .comments(entry.getComments())
                .entryDate(entry.getEntryDate())
                .createdAt(entry.getCreatedAt())
                .updatedAt(entry.getUpdatedAt())
                .build();
    }
}
