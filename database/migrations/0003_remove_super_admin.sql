-- Миграция 0003: премахване на SUPER_ADMIN нивото — вече има само USER/ADMIN.
SET NAMES utf8mb4;

UPDATE users SET role = 'ADMIN' WHERE role = 'SUPER_ADMIN';

ALTER TABLE users
  MODIFY COLUMN role ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER';
