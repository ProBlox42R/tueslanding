export type SeatType = "NORMAL" | "VIP" | "BLOCKED" | "AISLE";

export interface VenueRecord {
  id: string;
  name: string;
  description: string | null;
  rows_count: number;
  seats_per_row: number;
  layout_json: unknown;
  created_at: Date;
  updated_at: Date;
}

export interface SeatRecord {
  id: string;
  venue_id: string;
  row_label: string;
  seat_number: number;
  pos_x: string;
  pos_y: string;
  seat_type: SeatType;
}

export interface VenueWithSeats extends VenueRecord {
  seats: SeatRecord[];
}
