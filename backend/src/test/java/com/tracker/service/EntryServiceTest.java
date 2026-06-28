package com.tracker.service;

import com.tracker.dto.EntryRequestDTO;
import com.tracker.dto.EntryResponseDTO;
import com.tracker.dto.SummaryDTO;
import com.tracker.dto.UserResponseDTO;
import com.tracker.dto.UserSummaryDTO;
import com.tracker.entity.Entry;
import com.tracker.entity.Role;
import com.tracker.entity.User;
import com.tracker.repository.EntryRepository;
import com.tracker.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EntryServiceTest {

    @Mock
    private EntryRepository entryRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private EntryService entryService;

    private User user;
    private EntryRequestDTO requestDTO;
    private Entry existingEntry;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(UUID.randomUUID())
                .email("employee@example.com")
                .displayName("Employee User")
                .role(Role.EMPLOYEE)
                .build();

        requestDTO = EntryRequestDTO.builder()
                .project("Project Alpha")
                .module("Authentication")
                .submodule("OAuth2")
                .total(10)
                .pass(5)
                .fail(2)
                .onhold(1)
                .pending(2)
                .comments("Initial tests run")
                .build();

        existingEntry = Entry.builder()
                .id(UUID.randomUUID())
                .user(user)
                .project("Project Alpha")
                .module("Authentication")
                .submodule("OAuth2")
                .total(10)
                .pass(2)
                .fail(2)
                .onhold(1)
                .pending(5)
                .comments("First batch")
                .entryDate(LocalDate.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void upsertEntry_WhenEntryDoesNotExist_CreatesNewEntry() {
        when(entryRepository.findByUserIdAndProjectAndModuleAndSubmodule(any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(entryRepository.save(any(Entry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EntryResponseDTO response = entryService.upsertEntry(user, requestDTO);

        assertNotNull(response);
        assertEquals(user.getId(), response.getUserId());
        assertEquals("Project Alpha", response.getProject());
        assertEquals("OAuth2", response.getSubmodule());
        assertEquals(5, response.getPass());
        assertEquals(2, response.getFail());
        assertEquals("Inprogress", response.getStatus()); // pass > 0 & pending > 0 -> Inprogress
        verify(entryRepository, times(1)).save(any(Entry.class));
    }

    @Test
    void upsertEntry_WhenEntryExists_UpdatesExistingEntryWithNewCounts() {
        when(entryRepository.findByUserIdAndProjectAndModuleAndSubmodule(eq(user.getId()), eq("Project Alpha"), eq("Authentication"), eq("OAuth2")))
                .thenReturn(Optional.of(existingEntry));
        when(entryRepository.save(any(Entry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EntryRequestDTO updateDTO = EntryRequestDTO.builder()
                .project("Project Alpha")
                .module("Authentication")
                .submodule("OAuth2")
                .total(5)
                .pass(3)
                .fail(1)
                .onhold(0)
                .pending(1)
                .comments("Second batch")
                .build();

        EntryResponseDTO response = entryService.upsertEntry(user, updateDTO);

        assertNotNull(response);
        assertEquals(existingEntry.getId(), response.getId());
        assertEquals(3, response.getPass()); // Overwritten with 3
        assertEquals(1, response.getFail()); // Overwritten with 1
        assertEquals(0, response.getOnhold()); // Overwritten with 0
        assertEquals(1, response.getPending()); // Overwritten with 1
        assertEquals(5, response.getTotal()); // Overwritten with 5
        assertEquals("Inprogress", response.getStatus());
        assertEquals("Second batch", response.getComments()); // Overwritten with "Second batch"
        verify(entryRepository, times(1)).save(existingEntry);
    }

    @Test
    void statusCalculation_LogicTests() {
        // Test case: total > 0 and pass == total -> Pass
        EntryRequestDTO d1 = EntryRequestDTO.builder().total(10).pass(10).fail(0).onhold(0).pending(0).build();
        when(entryRepository.findByUserIdAndProjectAndModuleAndSubmodule(any(), any(), any(), any())).thenReturn(Optional.empty());
        when(entryRepository.save(any(Entry.class))).thenAnswer(invocation -> invocation.getArgument(0));
        assertEquals("Pass", entryService.upsertEntry(user, d1).getStatus());

        // Test case: pending > 0 and (pass > 0 or fail > 0) -> Inprogress
        EntryRequestDTO d2 = EntryRequestDTO.builder().total(10).pass(5).fail(0).onhold(0).pending(5).build();
        assertEquals("Inprogress", entryService.upsertEntry(user, d2).getStatus());

        // Test case: fail > 0 -> Fail
        EntryRequestDTO d3 = EntryRequestDTO.builder().total(10).pass(5).fail(5).onhold(0).pending(0).build();
        assertEquals("Fail", entryService.upsertEntry(user, d3).getStatus());

        // Test case: onhold > 0 -> On Hold
        EntryRequestDTO d4 = EntryRequestDTO.builder().total(10).pass(0).fail(0).onhold(10).pending(0).build();
        assertEquals("On Hold", entryService.upsertEntry(user, d4).getStatus());

        // Test case: pending > 0 -> Pending
        EntryRequestDTO d5 = EntryRequestDTO.builder().total(10).pass(0).fail(0).onhold(0).pending(10).build();
        assertEquals("Pending", entryService.upsertEntry(user, d5).getStatus());

        // Test case: total > 0 and (pass + na + functionalTeam) == total -> Pass
        EntryRequestDTO d6 = EntryRequestDTO.builder().total(10).pass(4).fail(0).onhold(0).pending(0).na(3).functionalTeam(3).build();
        assertEquals("Pass", entryService.upsertEntry(user, d6).getStatus());
    }

    @Test
    void upsertEntry_WhenTotalProvided_CalculatesPendingCountAndDefaultsNullsToZero() {
        when(entryRepository.findByUserIdAndProjectAndModuleAndSubmodule(any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(entryRepository.save(any(Entry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Test with na and functionalTeam specified
        EntryRequestDTO d1 = EntryRequestDTO.builder()
                .project("Project Alpha")
                .module("Auth")
                .submodule("Login")
                .total(10)
                .pass(4)
                .fail(2)
                .onhold(1)
                .na(1)
                .functionalTeam(1)
                .build();

        EntryResponseDTO res1 = entryService.upsertEntry(user, d1);
        assertEquals(1, res1.getNa());
        assertEquals(1, res1.getFunctionalTeam());
        assertEquals(1, res1.getPending()); // 10 - 4 - 2 - 1 - 1 - 1 = 1

        // Test with na and functionalTeam as null (defaults to 0)
        EntryRequestDTO d2 = EntryRequestDTO.builder()
                .project("Project Alpha")
                .module("Auth")
                .submodule("Login")
                .total(20)
                .pass(10)
                .fail(5)
                .onhold(2)
                .na(null)
                .functionalTeam(null)
                .build();

        EntryResponseDTO res2 = entryService.upsertEntry(user, d2);
        assertEquals(0, res2.getNa());
        assertEquals(0, res2.getFunctionalTeam());
        assertEquals(3, res2.getPending()); // 20 - 10 - 5 - 2 = 3
    }

    @Test
    void upsertEntry_WhenPassCountDecreased_ThrowsRuntimeException() {
        when(entryRepository.findByUserIdAndProjectAndModuleAndSubmodule(eq(user.getId()), eq("Project Alpha"), eq("Authentication"), eq("OAuth2")))
                .thenReturn(Optional.of(existingEntry));

        EntryRequestDTO invalidUpdateDTO = EntryRequestDTO.builder()
                .project("Project Alpha")
                .module("Authentication")
                .submodule("OAuth2")
                .total(10)
                .pass(existingEntry.getPass() - 1)
                .fail(1)
                .onhold(0)
                .pending(8)
                .build();

        assertThrows(RuntimeException.class, () -> entryService.upsertEntry(user, invalidUpdateDTO));
    }

    @Test
    void getEntriesForUser_ReturnsOrderedEntries() {
        Entry older = Entry.builder().entryDate(LocalDate.now().minusDays(1)).user(user).build();
        Entry newer = Entry.builder().entryDate(LocalDate.now()).user(user).build();

        when(entryRepository.findByUserIdOrderByEntryDateDesc(user.getId()))
                .thenReturn(Arrays.asList(newer, older));

        List<EntryResponseDTO> response = entryService.getEntriesForUser(user.getId());

        assertNotNull(response);
        assertEquals(2, response.size());
        assertEquals(LocalDate.now(), response.get(0).getEntryDate());
        assertEquals(LocalDate.now().minusDays(1), response.get(1).getEntryDate());
    }

    @Test
    void getAllEntries_ReturnsAllEntries() {
        Entry entry = Entry.builder().entryDate(LocalDate.now()).user(user).build();
        when(entryRepository.findAllByOrderByEntryDateDesc()).thenReturn(Collections.singletonList(entry));

        List<EntryResponseDTO> response = entryService.getAllEntries();

        assertNotNull(response);
        assertEquals(1, response.size());
    }

    @Test
    void deleteEntry_WhenAuthorized_DeletesEntry() {
        when(entryRepository.findById(existingEntry.getId())).thenReturn(Optional.of(existingEntry));

        assertDoesNotThrow(() -> entryService.deleteEntry(existingEntry.getId(), user.getId()));
        verify(entryRepository, times(1)).delete(existingEntry);
    }

    @Test
    void deleteEntry_WhenUnauthorized_ThrowsException() {
        when(entryRepository.findById(existingEntry.getId())).thenReturn(Optional.of(existingEntry));
        UUID randomUserId = UUID.randomUUID();

        Exception exception = assertThrows(RuntimeException.class, () -> {
            entryService.deleteEntry(existingEntry.getId(), randomUserId);
        });

        assertTrue(exception.getMessage().contains("Unauthorized"));
        verify(entryRepository, never()).delete(any());
    }

    @Test
    void getSummaryForUser_CalculatesTotalsAndPassRate() {
        Entry entry1 = Entry.builder().total(10).pass(8).fail(2).onhold(0).pending(0).build();
        Entry entry2 = Entry.builder().total(10).pass(2).fail(4).onhold(2).pending(2).build();

        when(entryRepository.findByUserId(user.getId())).thenReturn(Arrays.asList(entry1, entry2));

        SummaryDTO summary = entryService.getSummaryForUser(user.getId());

        assertNotNull(summary);
        assertEquals(2, summary.getTotalSubmodules());
        assertEquals(20, summary.getTotal());
        assertEquals(10, summary.getPass());
        assertEquals(6, summary.getFail());
        assertEquals(2, summary.getOnhold());
        assertEquals(2, summary.getPending());
        assertEquals(50.0, summary.getPassRate()); // 10 / 20 * 100
    }

    @Test
    void getOverallSummary_CalculatesGlobalSummary() {
        Entry entry1 = Entry.builder().total(5).pass(5).fail(0).onhold(0).pending(0).entryDate(LocalDate.now()).build();
        when(entryRepository.findAll()).thenReturn(Collections.singletonList(entry1));

        SummaryDTO summary = entryService.getOverallSummary();

        assertNotNull(summary);
        assertEquals(1, summary.getTotalSubmodules());
        assertEquals(100.0, summary.getPassRate());
    }

    @Test
    void getPerUserSummary_AggregatesPerUserCorrectly() {
        User otherUser = User.builder()
                .id(UUID.randomUUID())
                .email("other@example.com")
                .displayName("Other User")
                .role(Role.EMPLOYEE)
                .build();

        Entry entryUser = Entry.builder().user(user).total(10).pass(6).entryDate(LocalDate.now().minusDays(1)).build();
        Entry entryOther = Entry.builder().user(otherUser).total(10).pass(8).entryDate(LocalDate.now()).build();

        when(userRepository.findAll()).thenReturn(Arrays.asList(user, otherUser));
        when(entryRepository.findByUserId(user.getId())).thenReturn(Collections.singletonList(entryUser));
        when(entryRepository.findByUserId(otherUser.getId())).thenReturn(Collections.singletonList(entryOther));

        List<UserSummaryDTO> summaryList = entryService.getPerUserSummary();

        assertNotNull(summaryList);
        assertEquals(2, summaryList.size());

        UserSummaryDTO userSummary = summaryList.stream()
                .filter(s -> s.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals(60.0, userSummary.getSummary().getPassRate());
        assertEquals(LocalDate.now().minusDays(1), userSummary.getLastActive());

        UserSummaryDTO otherSummary = summaryList.stream()
                .filter(s -> s.getUser().getId().equals(otherUser.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals(80.0, otherSummary.getSummary().getPassRate());
        assertEquals(LocalDate.now(), otherSummary.getLastActive());
    }

    @Test
    void upsertEntry_WhenEntryDateProvided_SavesWithProvidedDate() {
        when(entryRepository.findByUserIdAndProjectAndModuleAndSubmodule(any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(entryRepository.save(any(Entry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LocalDate customDate = LocalDate.now().minusDays(5);
        EntryRequestDTO customDTO = EntryRequestDTO.builder()
                .project("Project Alpha")
                .module("Authentication")
                .submodule("OAuth2")
                .total(10)
                .pass(5)
                .fail(2)
                .entryDate(customDate)
                .build();

        EntryResponseDTO response = entryService.upsertEntry(user, customDTO);

        assertNotNull(response);
        assertEquals(customDate, response.getEntryDate());
        verify(entryRepository, times(1)).save(any(Entry.class));
    }
}
