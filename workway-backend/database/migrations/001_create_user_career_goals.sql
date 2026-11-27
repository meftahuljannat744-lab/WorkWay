CREATE TABLE IF NOT EXISTS user_career_goals (
    user_id BIGINT(20) UNSIGNED NOT NULL,
    career_id BIGINT(20) UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    KEY idx_user_career_goals_career_id (career_id),
    CONSTRAINT fk_user_career_goals_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_user_career_goals_career
        FOREIGN KEY (career_id)
        REFERENCES careers(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;
