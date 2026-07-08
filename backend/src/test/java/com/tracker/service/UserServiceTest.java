package com.tracker.service;

import com.tracker.dto.UserResponseDTO;
import com.tracker.entity.Role;
import com.tracker.entity.User;
import com.tracker.repository.UserRepository;
import com.tracker.repository.EntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EntryRepository entryRepository;

    @InjectMocks
    private UserService userService;

    private User employeeUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        employeeUser = User.builder()
                .id(userId)
                .email("test@example.com")
                .displayName("Test User")
                .role(Role.EMPLOYEE)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void getOrCreateUser_WhenUserExists_ReturnsExistingUser() {
        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Collections.singletonList(employeeUser));

        User result = userService.getOrCreateUser("test@example.com", "Test User");

        assertNotNull(result);
        assertEquals(userId, result.getId());
        assertEquals("test@example.com", result.getEmail());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void getOrCreateUser_WhenUserExistsWithDifferentDisplayName_UpdatesDisplayName() {
        when(userRepository.findByEmailIgnoreCase("test@example.com")).thenReturn(Collections.singletonList(employeeUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User result = userService.getOrCreateUser("test@example.com", "Updated Display Name");

        assertNotNull(result);
        assertEquals(userId, result.getId());
        assertEquals("Updated Display Name", result.getDisplayName());
        verify(userRepository, times(1)).save(employeeUser);
    }

    @Test
    void getOrCreateUser_WhenUserExistsButRoleNotAdminAndEmailMatchesAdminEmail_UpgradesAndReturnsUser() {
        User existingUserWithAdminEmail = User.builder()
                .id(userId)
                .email("vvnair7333@gmail.com")
                .displayName("Admin User")
                .role(Role.EMPLOYEE)
                .build();
        when(userRepository.findByEmailIgnoreCase("vvnair7333@gmail.com")).thenReturn(Collections.singletonList(existingUserWithAdminEmail));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User result = userService.getOrCreateUser("vvnair7333@gmail.com", "Admin User");

        assertNotNull(result);
        assertEquals(Role.SUPER_ADMIN, result.getRole());
        verify(userRepository, times(1)).save(existingUserWithAdminEmail);
    }

    @Test
    void getOrCreateUser_WhenUserDoesNotExist_CreatesAndReturnsNewUser() {
        when(userRepository.findByEmailIgnoreCase("new@example.com")).thenReturn(Collections.emptyList());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        User result = userService.getOrCreateUser("new@example.com", "New User");

        assertNotNull(result);
        assertNotNull(result.getId());
        assertEquals("new@example.com", result.getEmail());
        assertEquals("New User", result.getDisplayName());
        assertEquals(Role.EMPLOYEE, result.getRole());
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void getAllUsers_ReturnsMappedUserResponseDTOs() {
        User adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@example.com")
                .displayName("Admin User")
                .role(Role.ADMIN)
                .createdAt(LocalDateTime.now())
                .build();

        when(userRepository.findAll()).thenReturn(Arrays.asList(employeeUser, adminUser));

        List<UserResponseDTO> result = userService.getAllUsers();

        assertNotNull(result);
        assertEquals(2, result.size());
        
        UserResponseDTO dto1 = result.get(0);
        assertEquals(employeeUser.getId(), dto1.getId());
        assertEquals(employeeUser.getEmail(), dto1.getEmail());
        assertEquals("EMPLOYEE", dto1.getRole());

        UserResponseDTO dto2 = result.get(1);
        assertEquals(adminUser.getId(), dto2.getId());
        assertEquals(adminUser.getEmail(), dto2.getEmail());
        assertEquals("ADMIN", dto2.getRole());
    }

    @Test
    void updateRole_WhenUserExistsAndRoleIsValid_UpdatesAndReturnsUser() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(employeeUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User result = userService.updateRole(userId, "ADMIN");

        assertNotNull(result);
        assertEquals(Role.ADMIN, result.getRole());
        verify(userRepository, times(1)).save(employeeUser);
    }

    @Test
    void updateRole_WhenUserDoesNotExist_ThrowsException() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        Exception exception = assertThrows(RuntimeException.class, () -> {
            userService.updateRole(userId, "ADMIN");
        });

        assertTrue(exception.getMessage().contains("User not found"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateRole_WhenRoleIsInvalid_ThrowsException() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(employeeUser));

        assertThrows(IllegalArgumentException.class, () -> {
            userService.updateRole(userId, "INVALID_ROLE");
        });
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateRole_WhenRoleIsSuperAdmin_ThrowsException() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(employeeUser));

        assertThrows(IllegalArgumentException.class, () -> {
            userService.updateRole(userId, "SUPER_ADMIN");
        });
        verify(userRepository, never()).save(any(User.class));
    }
}
