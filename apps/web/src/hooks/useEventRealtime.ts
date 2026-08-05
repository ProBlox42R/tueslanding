import { useEffect, useState } from "react";

export type SeatStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";

interface SeatMapState {
  remainingTickets: number;
  seatStatusById: Record<string, SeatStatus>;
}

/**
 * Абонира се за SSE потока на конкретно събитие и поддържа локално
 * състояние на местата, синхронизирано с backend-а (source of truth).
 * При прекъсване на връзката браузърът автоматично прави reconnect
 * (стандартно EventSource поведение); при reconnect сървърът винаги
 * праща snapshot първо, така че състоянието се синхронизира отново.
 */
export function useEventRealtime(eventId: string | undefined) {
  const [state, setState] = useState<SeatMapState>({ remainingTickets: 0, seatStatusById: {} });

  useEffect(() => {
    if (!eventId) return;
    const source = new EventSource(`/api/realtime/events/${eventId}/stream`);

    source.onmessage = (ev) => {
      const payload = JSON.parse(ev.data);
      if (payload.type === "snapshot" || payload.type === "seat_map_update") {
        const seatStatusById: Record<string, SeatStatus> = {};
        for (const s of payload.seats) {
          seatStatusById[s.eventSeatId] = s.status;
        }
        setState({ remainingTickets: payload.remainingTickets, seatStatusById });
      }
    };

    return () => source.close();
  }, [eventId]);

  return state;
}
