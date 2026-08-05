-- Миграция 0002: име на купувача, въведено в checkout стъпката
-- (потребителят пише как да изглежда името на билета, без данни за карта).
SET NAMES utf8mb4;

ALTER TABLE orders
  ADD COLUMN buyer_name VARCHAR(150) NULL AFTER user_id;
