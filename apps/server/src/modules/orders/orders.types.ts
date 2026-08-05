export type OrderStatus = "UNPAID" | "PAID" | "REFUNDED" | "CANCELLED";

export interface OrderRecord {
  id: string;
  user_id: string;
  buyer_name: string | null;
  event_id: string;
  reservation_id: string | null;
  total_amount: string;
  currency: string;
  status: OrderStatus;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderAdminRow extends OrderRecord {
  username: string;
  email: string;
  event_name: string;
  ticket_count: number;
}
