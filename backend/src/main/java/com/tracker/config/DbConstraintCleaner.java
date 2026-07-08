package com.tracker.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DbConstraintCleaner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        try {
            log.info("Dropping users role check constraint if it exists...");
            // PostgreSQL/H2 compatible SQL to drop check constraint
            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            log.info("Successfully dropped users role check constraint.");
        } catch (Exception e) {
            log.warn("Failed to drop users role check constraint: " + e.getMessage());
        }
    }
}
