export type EventStatus = "DRAFT" | "PUBLISHED" | "SALES_STOPPED" | "ARCHIVED";
export type EventSeatStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";

export interface EventRecord {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  start_date: Date;
  end_date: Date | null;
  normal_price: string;
  vip_price: string | null;
  currency: string;
  status: EventStatus;
  created_at: Date;
  updated_at: Date;
}

export interface EventSeatRecord {
  id: string;
  event_id: string;
  seat_id: string;
  status: EventSeatStatus;
  price: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
  pos_x: string;
  pos_y: string;
}

export interface SeatMapSnapshot {
  remainingTickets: number;
  seats: Array<{ eventSeatId: string; status: EventSeatStatus }>;
}
