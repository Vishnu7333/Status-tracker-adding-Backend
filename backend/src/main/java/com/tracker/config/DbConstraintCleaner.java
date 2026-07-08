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
            log.info("Checking and adding users status column if not exists...");
            try {
                jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS status varchar(255) DEFAULT 'ACTIVE' NOT NULL");
                log.info("Successfully checked/added users status column.");
            } catch (Exception e) {
                log.warn("Failed to add status column via ADD COLUMN IF NOT EXISTS: " + e.getMessage() + ". Trying standard ALTER...");
                try {
                    jdbcTemplate.execute("ALTER TABLE users ADD COLUMN status varchar(255) DEFAULT 'ACTIVE' NOT NULL");
                    log.info("Successfully added status column via standard ALTER.");
                } catch (Exception ex) {
                    log.warn("Standard ALTER failed (column likely already exists): " + ex.getMessage());
                }
            }

            log.info("Dropping users role check constraint if it exists...");
            // PostgreSQL/H2 compatible SQL to drop check constraint
            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            log.info("Successfully dropped users role check constraint.");
        } catch (Exception e) {
            log.error("Failed in DbConstraintCleaner run: " + e.getMessage(), e);
        }
    }
}
