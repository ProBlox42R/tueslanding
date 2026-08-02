export type TicketStatus = "VALID" | "USED" | "REFUNDED" | "CANCELLED";

export interface TicketRecord {
  id: string;
  order_id: string;
  user_id: string;
  event_id: string;
  event_seat_id: string;
  qr_token_hash: string;
  pdf_object_key: string | null;
  status: TicketStatus;
  used_at: Date | null;
  created_at: Date;
}

export interface TicketDetail extends TicketRecord {
  event_name: string;
  start_date: Date;
  venue_name: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
  price: string;
  username: string;
  email: string;
  buyer_name: string | null;
}
