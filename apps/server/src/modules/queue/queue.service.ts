import { env } from "../../config/env.js";
import { TooMany } from "../../utils/http-error.js";

/**
 * Проста in-memory queue/waiting room (спецификация т. 25-26).
 * Активира се само когато едновременните "активни checkout сесии"
 * надвишат прага (по подразбиране 50) — не се активира постоянно.
 *
 * Слотът се държи, докато потребителят завърши покупката (checkout success)
 * или изтече неактивен за повече от RESERVATION_TTL_MINUTES + буфер, като
 * тогава автоматично се освобождава при следваща проверка (lazy TTL cleanup).
 * Това е нарочно опростено спрямо разпределена/persist-ната опашка, защото
 * проектът е за десетки едновременни потребители, не enterprise мащаб.
 */

interface ActiveSlot {
  enteredAt: number;
}

const activeCheckouts = new Map<string, ActiveSlot>();
const waitingQueue: string[] = []; // userId в ред на пристигане

const SLOT_TTL_MS = (env.RESERVATION_TTL_MINUTES + 5) * 60 * 1000;

function cleanupStale() {
  const now = Date.now();
  for (const [userId, slot] of activeCheckouts.entries()) {
    if (now - slot.enteredAt > SLOT_TTL_MS) {
      activeCheckouts.delete(userId);
    }
  }
  // Опитай да качиш следващите от опашката в активните слотове.
  while (waitingQueue.length > 0 && activeCheckouts.size < env.QUEUE_ACTIVE_CHECKOUT_THRESHOLD) {
    const next = waitingQueue.shift();
    if (next && !activeCheckouts.has(next)) {
      activeCheckouts.set(next, { enteredAt: Date.now() });
    }
  }
}

export const queueService = {
  tryEnter(userId: string): { admitted: boolean; position?: number; activeCount: number } {
    cleanupStale();

    if (activeCheckouts.has(userId)) {
      return { admitted: true, activeCount: activeCheckouts.size };
    }

    if (activeCheckouts.size < env.QUEUE_ACTIVE_CHECKOUT_THRESHOLD) {
      activeCheckouts.set(userId, { enteredAt: Date.now() });
      return { admitted: true, activeCount: activeCheckouts.size };
    }

    if (!waitingQueue.includes(userId)) {
      waitingQueue.push(userId);
    }
    return {
      admitted: false,
      position: waitingQueue.indexOf(userId) + 1,
      activeCount: activeCheckouts.size,
    };
  },

  getStatus(userId: string): { admitted: boolean; position?: number } {
    cleanupStale();
    if (activeCheckouts.has(userId)) return { admitted: true };
    const idx = waitingQueue.indexOf(userId);
    if (idx === -1) return { admitted: false };
    return { admitted: false, position: idx + 1 };
  },

  assertAdmitted(userId: string): void {
    cleanupStale();
    if (!activeCheckouts.has(userId)) {
      throw TooMany(
        "В момента има много хора, които закупуват билети. Моля, изчакайте своя ред."
      );
    }
  },

  leaveCheckout(userId: string): void {
    activeCheckouts.delete(userId);
    cleanupStale();
  },
};
