"""Initial schema — full Online Voting System

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS constituencies (
            id        BIGINT AUTO_INCREMENT PRIMARY KEY,
            name      VARCHAR(150) NOT NULL UNIQUE,
            state     VARCHAR(100) NOT NULL,
            district  VARCHAR(100),
            seat_type VARCHAR(20) NOT NULL DEFAULT 'GENERAL',
            total_voters INT,
            region    VARCHAR(100)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id             BIGINT AUTO_INCREMENT PRIMARY KEY,
            email          VARCHAR(150) NOT NULL UNIQUE,
            password_hash  VARCHAR(255) NOT NULL,
            full_name      VARCHAR(150) NOT NULL,
            phone          VARCHAR(20),
            role           ENUM('VOTER','CANDIDATE','ADMIN','FIELD_OFFICER') NOT NULL,
            is_active      BOOLEAN NOT NULL DEFAULT TRUE,
            email_verified BOOLEAN NOT NULL DEFAULT FALSE,
            created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at     DATETIME ON UPDATE CURRENT_TIMESTAMP
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS voter_profiles (
            id              BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id         BIGINT NOT NULL UNIQUE,
            voter_id_number VARCHAR(50) UNIQUE,
            constituency_id BIGINT NOT NULL,
            date_of_birth   DATE,
            gender          ENUM('MALE','FEMALE','OTHER'),
            address         TEXT,
            photo_url       VARCHAR(500),
            national_id     VARCHAR(100) UNIQUE,
            created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at      DATETIME ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_vp_user FOREIGN KEY (user_id) REFERENCES users(id),
            CONSTRAINT fk_vp_constituency FOREIGN KEY (constituency_id) REFERENCES constituencies(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS voter_id_applications (
            id              BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id         BIGINT,
            full_name       VARCHAR(150) NOT NULL,
            date_of_birth   DATE NOT NULL,
            gender          ENUM('MALE','FEMALE','OTHER') NOT NULL,
            address         TEXT NOT NULL,
            constituency_id BIGINT,
            photo_url       VARCHAR(500),
            national_id     VARCHAR(100) NOT NULL,
            status          ENUM('PENDING','UNDER_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
            reviewed_by     BIGINT,
            remarks         TEXT,
            submitted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at     DATETIME,
            CONSTRAINT fk_via_user FOREIGN KEY (user_id) REFERENCES users(id),
            CONSTRAINT fk_via_constituency FOREIGN KEY (constituency_id) REFERENCES constituencies(id),
            CONSTRAINT fk_via_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS elections (
            id               BIGINT AUTO_INCREMENT PRIMARY KEY,
            title            VARCHAR(255) NOT NULL,
            description      TEXT,
            election_type    ENUM('GENERAL','STATE','LOCAL') NOT NULL DEFAULT 'GENERAL',
            constituency_id  BIGINT,
            status           ENUM('DRAFT','NOMINATION_OPEN','NOMINATION_CLOSED','VOTING_OPEN','VOTING_CLOSED','RESULTS_DECLARED') NOT NULL DEFAULT 'DRAFT',
            nomination_start DATETIME,
            nomination_end   DATETIME,
            voting_start     DATETIME,
            voting_end       DATETIME,
            vote_salt        VARCHAR(64) NOT NULL,
            created_by       BIGINT,
            created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       DATETIME ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_el_constituency FOREIGN KEY (constituency_id) REFERENCES constituencies(id),
            CONSTRAINT fk_el_creator FOREIGN KEY (created_by) REFERENCES users(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS candidates (
            id                BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id           BIGINT NOT NULL,
            election_id       BIGINT NOT NULL,
            constituency_id   BIGINT NOT NULL,
            party_name        VARCHAR(150),
            party_symbol_url  VARCHAR(500),
            manifesto         TEXT,
            education         TEXT,
            criminal_record   TEXT,
            photo_url         VARCHAR(500),
            nomination_status ENUM('SUBMITTED','APPROVED','REJECTED') NOT NULL DEFAULT 'SUBMITTED',
            rejection_reason  TEXT,
            online_vote_count INT NOT NULL DEFAULT 0,
            UNIQUE KEY uq_candidate_election (user_id, election_id),
            CONSTRAINT fk_cand_user FOREIGN KEY (user_id) REFERENCES users(id),
            CONSTRAINT fk_cand_election FOREIGN KEY (election_id) REFERENCES elections(id),
            CONSTRAINT fk_cand_constituency FOREIGN KEY (constituency_id) REFERENCES constituencies(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS votes (
            id               BIGINT AUTO_INCREMENT PRIMARY KEY,
            election_id      BIGINT NOT NULL,
            candidate_id     BIGINT NOT NULL,
            constituency_id  BIGINT,
            voter_token_hash VARCHAR(255) NOT NULL,
            voted_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_vote (voter_token_hash, election_id),
            CONSTRAINT fk_vote_election FOREIGN KEY (election_id) REFERENCES elections(id),
            CONSTRAINT fk_vote_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id),
            CONSTRAINT fk_vote_constituency FOREIGN KEY (constituency_id) REFERENCES constituencies(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS election_results (
            id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
            election_id        BIGINT NOT NULL,
            candidate_id       BIGINT NOT NULL,
            constituency_id    BIGINT,
            online_votes       INT NOT NULL DEFAULT 0,
            manual_booth_votes INT NOT NULL DEFAULT 0,
            finalized          BOOLEAN NOT NULL DEFAULT FALSE,
            entered_by         BIGINT,
            UNIQUE KEY uq_result (election_id, candidate_id),
            CONSTRAINT fk_res_election FOREIGN KEY (election_id) REFERENCES elections(id),
            CONSTRAINT fk_res_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id),
            CONSTRAINT fk_res_constituency FOREIGN KEY (constituency_id) REFERENCES constituencies(id),
            CONSTRAINT fk_res_admin FOREIGN KEY (entered_by) REFERENCES users(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id         BIGINT AUTO_INCREMENT PRIMARY KEY,
            user_id    BIGINT NOT NULL,
            otp_hash   VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            used       BOOLEAN NOT NULL DEFAULT FALSE,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS forum_threads (
            id              BIGINT AUTO_INCREMENT PRIMARY KEY,
            title           VARCHAR(255) NOT NULL,
            body            TEXT NOT NULL,
            author_id       BIGINT NOT NULL,
            constituency_id BIGINT,
            election_id     BIGINT,
            thread_type     ENUM('DISCUSSION','CAMPAIGN') NOT NULL DEFAULT 'DISCUSSION',
            pinned          BOOLEAN NOT NULL DEFAULT FALSE,
            created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at      DATETIME ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_ft_author FOREIGN KEY (author_id) REFERENCES users(id),
            CONSTRAINT fk_ft_constituency FOREIGN KEY (constituency_id) REFERENCES constituencies(id),
            CONSTRAINT fk_ft_election FOREIGN KEY (election_id) REFERENCES elections(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS forum_posts (
            id             BIGINT AUTO_INCREMENT PRIMARY KEY,
            thread_id      BIGINT NOT NULL,
            author_id      BIGINT NOT NULL,
            body           TEXT NOT NULL,
            parent_post_id BIGINT,
            created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at     DATETIME ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT fk_fp_thread FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
            CONSTRAINT fk_fp_author FOREIGN KEY (author_id) REFERENCES users(id),
            CONSTRAINT fk_fp_parent FOREIGN KEY (parent_post_id) REFERENCES forum_posts(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id              BIGINT AUTO_INCREMENT PRIMARY KEY,
            room_id         VARCHAR(100) NOT NULL,
            sender_id       BIGINT NOT NULL,
            constituency_id BIGINT,
            message         TEXT NOT NULL,
            sent_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cm_room (room_id),
            CONSTRAINT fk_cm_sender FOREIGN KEY (sender_id) REFERENCES users(id),
            CONSTRAINT fk_cm_constituency FOREIGN KEY (constituency_id) REFERENCES constituencies(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id           BIGINT AUTO_INCREMENT PRIMARY KEY,
            recipient_id BIGINT NOT NULL,
            sender_id    BIGINT,
            type         ENUM('APPLICATION_STATUS','VOTE_CONFIRMATION','ELECTION_OPEN','RESULT_DECLARED','MESSAGE','SYSTEM') NOT NULL,
            title        VARCHAR(255) NOT NULL,
            body         TEXT,
            is_read      BOOLEAN NOT NULL DEFAULT FALSE,
            created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_notif_recipient FOREIGN KEY (recipient_id) REFERENCES users(id),
            CONSTRAINT fk_notif_sender FOREIGN KEY (sender_id) REFERENCES users(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id          BIGINT AUTO_INCREMENT PRIMARY KEY,
            actor_id    BIGINT,
            action      VARCHAR(100) NOT NULL,
            entity_type VARCHAR(50),
            entity_id   BIGINT,
            description TEXT,
            ip_address  VARCHAR(45),
            created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_al_actor FOREIGN KEY (actor_id) REFERENCES users(id)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS constituency_pincodes (
            pincode         VARCHAR(6) PRIMARY KEY,
            constituency_id BIGINT NOT NULL,
            CONSTRAINT fk_cp_constituency FOREIGN KEY (constituency_id) REFERENCES constituencies(id)
        )
    """)


def downgrade() -> None:
    for table in [
        "constituency_pincodes", "audit_logs", "notifications", "chat_messages",
        "forum_posts", "forum_threads", "password_reset_tokens", "election_results",
        "votes", "candidates", "elections", "voter_id_applications", "voter_profiles",
        "users", "constituencies",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {table}")
