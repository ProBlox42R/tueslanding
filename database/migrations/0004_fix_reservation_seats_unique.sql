-- Миграция 0004: критичен fix — reservation_seats.event_seat_id и
-- tickets.event_seat_id не трябва да имат постоянен UNIQUE constraint.
--
-- Проблем: uq_reservation_seats_seat/uq_tickets_event_seat правеха
-- невъзможно едно и също място да бъде резервирано/продадено повторно,
-- ВИНАГИ — дори след като първата резервация изтече/бъде отказана, или
-- билетът бъде възстановен и мястото се върне в AVAILABLE. С други думи,
-- всяко място ставаше перманентно неизползваемо след първия опит.
--
-- Защитата срещу едновременна резервация/продажба на едно и също място
-- от двама потребители вече се осигурява изцяло от event_seats.status +
-- row-level locking (SELECT ... FOR UPDATE) в съответните service файлове
-- — това е истинският механизъм за конкурентност, а не тези constraints.
--
-- ADD и DROP са в един ALTER TABLE, защото InnoDB изисква поддържащ индекс
-- за foreign key констрейнта през цялото време — новият индекс трябва да
-- се появи, преди старият да изчезне.
SET NAMES utf8mb4;

ALTER TABLE reservation_seats
  ADD INDEX idx_reservation_seats_event_seat (event_seat_id),
  DROP INDEX uq_reservation_seats_seat;

ALTER TABLE tickets
  ADD INDEX idx_tickets_event_seat (event_seat_id),
  DROP INDEX uq_tickets_event_seat;
