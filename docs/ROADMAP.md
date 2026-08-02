# Пътна карта (roadmap) — фазова разработка

Следвайки правилото от спецификацията: първо стабилна архитектура, после
постепенна имплементация, с проверка на съществуващата функционалност след
всяка фаза.

- [x] Архитектура, database схема, автентикация, Resend email, Docker Compose
- [x] Зали и места: venue CRUD, visual seat editor
- [x] Събития: event CRUD, публикуване, event_seats генериране
- [x] Резервации: seat locking с MySQL транзакции/row locks, expiry sweep
- [x] Realtime: SSE за оставащи билети, seat status, reconnect/resync
- [x] Плащане: фиктивен/вътрешен instant-pay checkout (виж README)
- [x] PDF билети (лого, QR) + локално файлово съхранение (R2-готово)
- [x] QR scanner (admin), атомна ticket validation, scan log
- [x] Admin dashboard: статистики, поръчки, refunds, admin/super-admin роли
- [x] Queue / waiting room (>50 активни checkout потребители)
- [x] Frontend: React + Tailwind + Material 3, светла/тъмна тема
- [x] Едно приложение / един порт: Express сервира build-натия frontend в production
- [x] Едно администраторско ниво (ADMIN) — премахнат SUPER_ADMIN
- [x] Cloudflare R2 реално имплементиран (S3-съвместимо), с explicit R2_ENABLED toggle
- [x] PDF билет редизайн — бял/разпечатваем, кирилица чрез вграден DejaVu Sans шрифт
- [x] Имейл темплейти — тъмен "glass" дизайн, консистентен за всички 4 типа
- [x] **Критичен fix**: `reservation_seats`/`tickets` имаха постоянен UNIQUE
      constraint върху `event_seat_id`, което правеше всяко място
      перманентно нерезервируемо след първия опит (дори след отказана/
      изтекла резервация или refund). Открито и поправено чрез реален
      end-to-end тест срещу истинска MySQL база (миграция 0004).
- [ ] Автоматизирани тестове (auth, reservations, payments, tickets,
      authorization, security/IDOR/SQLi) — предстоящо
- [ ] Финален формален security review чеклист от спецификацията
