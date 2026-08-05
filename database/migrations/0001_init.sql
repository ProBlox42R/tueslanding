-- Миграция 0001: начална схема
-- Кодировка/сортиране
SET NAMES utf8mb4;

-- =========================================================
-- USERS & AUTH
-- =========================================================

CREATE TABLE users (
  id                CHAR(36)      NOT NULL PRIMARY KEY,
  username          VARCHAR(32)   NOT NULL,
  email             VARCHAR(255)  NOT NULL,
  password_hash     VARCHAR(255)  NOT NULL,
  email_verified    TINYINT(1)    NOT NULL DEFAULT 0,
  role              ENUM('USER','ADMIN','SUPER_ADMIN') NOT NULL DEFAULT 'USER',
  is_active         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE email_verification_tokens (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  user_id     CHAR(36)     NOT NULL,
  token_hash  CHAR(64)     NOT NULL,
  expires_at  DATETIME(3)  NOT NULL,
  used_at     DATETIME(3)  NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_evt_token_hash (token_hash),
  KEY idx_evt_user (user_id),
  CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE password_reset_tokens (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  user_id     CHAR(36)     NOT NULL,
  token_hash  CHAR(64)     NOT NULL,
  expires_at  DATETIME(3)  NOT NULL,
  used_at     DATETIME(3)  NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_prt_token_hash (token_hash),
  KEY idx_prt_user (user_id),
  CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sessions (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  user_id      CHAR(36)     NOT NULL,
  token_hash   CHAR(64)     NOT NULL,
  user_agent   VARCHAR(255) NULL,
  ip_address   VARCHAR(64)  NULL,
  expires_at   DATETIME(3)  NOT NULL,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY idx_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rate_limit_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  bucket_key  VARCHAR(191)    NOT NULL,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_rle_bucket_time (bucket_key, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- VENUES & SEATS
-- =========================================================

CREATE TABLE venues (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  name         VARCHAR(150) NOT NULL,
  description  TEXT         NULL,
  rows_count   INT UNSIGNED NOT NULL,
  seats_per_row INT UNSIGNED NOT NULL,
  layout_json  JSON         NULL,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE seats (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  venue_id    CHAR(36)     NOT NULL,
  row_label   VARCHAR(8)   NOT NULL,
  seat_number INT UNSIGNED NOT NULL,
  pos_x       DECIMAL(8,2) NOT NULL DEFAULT 0,
  pos_y       DECIMAL(8,2) NOT NULL DEFAULT 0,
  seat_type   ENUM('NORMAL','VIP','BLOCKED','AISLE') NOT NULL DEFAULT 'NORMAL',
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_seats_venue (venue_id),
  UNIQUE KEY uq_seats_venue_row_num (venue_id, row_label, seat_number),
  CONSTRAINT fk_seats_venue FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- EVENTS
-- =========================================================

CREATE TABLE events (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  venue_id      CHAR(36)     NOT NULL,
  name          VARCHAR(200) NOT NULL,
  description   TEXT         NULL,
  start_date    DATETIME(3)  NOT NULL,
  end_date      DATETIME(3)  NULL,
  normal_price  DECIMAL(10,2) NOT NULL,
  vip_price     DECIMAL(10,2) NULL,
  currency      CHAR(3)      NOT NULL DEFAULT 'BGN',
  status        ENUM('DRAFT','PUBLISHED','SALES_STOPPED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_events_venue (venue_id),
  KEY idx_events_status_start (status, start_date),
  CONSTRAINT fk_events_venue FOREIGN KEY (venue_id) REFERENCES venues(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Конкретното състояние на всяко място за конкретно събитие.
-- Тук се случва конкурентният контрол (row locking) при резервация.
CREATE TABLE event_seats (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  event_id    CHAR(36)     NOT NULL,
  seat_id     CHAR(36)     NOT NULL,
  status      ENUM('AVAILABLE','RESERVED','SOLD','BLOCKED') NOT NULL DEFAULT 'AVAILABLE',
  price       DECIMAL(10,2) NOT NULL,
  version     INT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_event_seat (event_id, seat_id),
  KEY idx_event_seats_status (event_id, status),
  CONSTRAINT fk_event_seats_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_seats_seat FOREIGN KEY (seat_id) REFERENCES seats(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- RESERVATIONS
-- =========================================================

CREATE TABLE reservations (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  user_id     CHAR(36)     NOT NULL,
  event_id    CHAR(36)     NOT NULL,
  status      ENUM('ACTIVE','EXPIRED','CONVERTED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  expires_at  DATETIME(3)  NOT NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_reservations_user (user_id),
  KEY idx_reservations_event_status (event_id, status),
  KEY idx_reservations_expiry (status, expires_at),
  CONSTRAINT fk_reservations_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_reservations_event FOREIGN KEY (event_id) REFERENCES events(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reservation_seats (
  reservation_id CHAR(36) NOT NULL,
  event_seat_id  CHAR(36) NOT NULL,
  PRIMARY KEY (reservation_id, event_seat_id),
  UNIQUE KEY uq_reservation_seats_seat (event_seat_id),
  CONSTRAINT fk_rs_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  CONSTRAINT fk_rs_event_seat FOREIGN KEY (event_seat_id) REFERENCES event_seats(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- ORDERS & PAYMENTS
-- =========================================================

CREATE TABLE orders (
  id                          CHAR(36)     NOT NULL PRIMARY KEY,
  user_id                     CHAR(36)     NOT NULL,
  event_id                    CHAR(36)     NOT NULL,
  reservation_id              CHAR(36)     NULL,
  total_amount                DECIMAL(10,2) NOT NULL,
  currency                    CHAR(3)      NOT NULL DEFAULT 'BGN',
  status                      ENUM('UNPAID','PAID','REFUNDED','CANCELLED') NOT NULL DEFAULT 'UNPAID',
  stripe_checkout_session_id  VARCHAR(191) NULL,
  stripe_payment_intent_id    VARCHAR(191) NULL,
  created_at                  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at                  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_orders_checkout_session (stripe_checkout_session_id),
  UNIQUE KEY uq_orders_payment_intent (stripe_payment_intent_id),
  KEY idx_orders_user (user_id),
  KEY idx_orders_event (event_id),
  KEY idx_orders_status (status),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_orders_event FOREIGN KEY (event_id) REFERENCES events(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Обработени Stripe webhook събития — гарантира идемпотентност.
CREATE TABLE processed_webhook_events (
  id                CHAR(36)     NOT NULL PRIMARY KEY,
  stripe_event_id   VARCHAR(191) NOT NULL,
  event_type        VARCHAR(100) NOT NULL,
  processed_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_webhook_stripe_event (stripe_event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
-- TICKETS
-- =========================================================

CREATE TABLE tickets (
  id             CHAR(36)     NOT NULL PRIMARY KEY,
  order_id       CHAR(36)     NOT NULL,
  user_id        CHAR(36)     NOT NULL,
  event_id       CHAR(36)     NOT NULL,
  event_seat_id  CHAR(36)     NOT NULL,
  qr_token_hash  CHAR(64)     NOT NULL,
  pdf_object_key VARCHAR(255) NULL,
  status         ENUM('VALID','USED','REFUNDED','CANCELLED') NOT NULL DEFAULT 'VALID',
  used_at        DATETIME(3)  NULL,
  created_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_tickets_qr_token_hash (qr_token_hash),
  UNIQUE KEY uq_tickets_event_seat (event_seat_id),
  KEY idx_tickets_order (order_id),
  KEY idx_tickets_user (user_id),
  KEY idx_tickets_event (event_id),
  CONSTRAINT fk_tickets_order FOREIGN KEY (order_id) REFERENCES orders(id),
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_tickets_event FOREIGN KEY (event_id) REFERENCES events(id),
  CONSTRAINT fk_tickets_event_seat FOREIGN KEY (event_seat_id) REFERENCES event_seats(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE ticket_scan_log (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  ticket_id   CHAR(36)     NOT NULL,
  scanned_by  CHAR(36)     NOT NULL,
  result      ENUM('VALID','ALREADY_USED','INVALID') NOT NULL,
  scanned_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_scan_log_ticket (ticket_id),
  CONSTRAINT fk_scan_log_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  CONSTRAINT fk_scan_log_admin FOREIGN KEY (scanned_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
