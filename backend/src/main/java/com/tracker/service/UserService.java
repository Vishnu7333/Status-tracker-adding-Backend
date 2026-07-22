package com.tracker.service;

import com.tracker.dto.UserResponseDTO;
import com.tracker.entity.Role;
import com.tracker.entity.User;
import com.tracker.repository.UserRepository;
import com.tracker.entity.Entry;
import com.tracker.repository.EntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final EntryRepository entryRepository;

    @Transactional
    public User getOrCreateUser(String email, String displayName) {
        String normalizedEmail = email != null ? email.trim().toLowerCase() : "";
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            boolean updated = false;
            if (displayName != null && !displayName.trim().isEmpty() && !displayName.equals(user.getDisplayName())) {
                user.setDisplayName(displayName);
                updated = true;
            }
            if (!normalizedEmail.equals(user.getEmail())) {
                user.setEmail(normalizedEmail);
                updated = true;
            }
            if (normalizedEmail.equals("vvnair7333@gmail.com") && user.getRole() != Role.SUPER_ADMIN) {
                user.setRole(Role.SUPER_ADMIN);
                updated = true;
            }
            if (updated) {
                return userRepository.save(user);
            }
            return user;
        } else {
            Role role = Role.EMPLOYEE;
            if (normalizedEmail.equals("vvnair7333@gmail.com")) {
                role = Role.SUPER_ADMIN;
            }
            User newUser = User.builder()
                    .email(normalizedEmail)
                    .displayName(displayName)
                    .role(role)
                    .build();
            return userRepository.save(newUser);
        }
    }

    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(user -> UserResponseDTO.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .displayName(user.getDisplayName())
                        .role(user.getRole().name())
                        .status(user.getStatus())
                        .createdAt(user.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public User updateRole(UUID userId, String role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        try {
            Role newRole = Role.valueOf(role.toUpperCase());
            if (newRole == Role.SUPER_ADMIN) {
                throw new IllegalArgumentException("Cannot manually assign SUPER_ADMIN role");
            }
            user.setRole(newRole);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role: " + role + ". " + e.getMessage());
        }
        
        return userRepository.save(user);
    }

    @Transactional
    public User updateStatus(UUID userId, String status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        if (user.getEmail().equalsIgnoreCase("vvnair7333@gmail.com")) {
            throw new IllegalArgumentException("Super Admin status cannot be changed");
        }
        
        String upperStatus = status.toUpperCase().trim();
        if (!"ACTIVE".equals(upperStatus) && !"INACTIVE".equals(upperStatus)) {
            throw new IllegalArgumentException("Invalid status: " + status + ". Allowed values are ACTIVE or INACTIVE.");
        }
        
        user.setStatus(upperStatus);
        return userRepository.save(user);
    }

    @Transactional
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        if (user.getEmail().equalsIgnoreCase("vvnair7333@gmail.com")) {
            throw new IllegalArgumentException("Super Admin cannot be deleted");
        }
        
        // Delete all entries belonging to the user first
        List<Entry> entries = entryRepository.findByUserId(userId);
        if (entries != null && !entries.isEmpty()) {
            entryRepository.deleteAll(entries);
        }
        
        // Delete the user
        userRepository.delete(user);
    }

    @Transactional(readOnly = true)
    public User findByEmail(String email) {
        String normalizedEmail = email != null ? email.trim().toLowerCase() : "";
        return userRepository.findByEmailIgnoreCase(normalizedEmail).orElse(null);
    }
}
