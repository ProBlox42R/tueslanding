import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RequireAuth, RequireGuest, RequireStaff } from "./components/RequireRole";

import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { VerifyEmail } from "./pages/VerifyEmail";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Landing } from "./pages/Landing";
import { EventsList } from "./pages/EventsList";
import { EventDetail } from "./pages/EventDetail";
import { Checkout } from "./pages/Checkout";
import { MyTickets } from "./pages/MyTickets";
import { TicketDetail } from "./pages/TicketDetail";

import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminVenues } from "./pages/admin/AdminVenues";
import { AdminEvents } from "./pages/admin/AdminEvents";
import { AdminOrders } from "./pages/admin/AdminOrders";
import { AdminScanner } from "./pages/admin/AdminScanner";
import { AdminManagement } from "./pages/admin/AdminManagement";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="events" element={<EventsList />} />
        <Route path="events/:id" element={<EventDetail />} />

        <Route element={<RequireGuest />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>

        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />

        <Route element={<RequireAuth />}>
          <Route path="checkout/:reservationId" element={<Checkout />} />
          <Route path="my-tickets" element={<MyTickets />} />
          <Route path="tickets/:id" element={<TicketDetail />} />
        </Route>

        <Route path="admin" element={<RequireStaff />}>
          <Route index element={<AdminDashboard />} />
          <Route path="venues" element={<AdminVenues />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="scanner" element={<AdminScanner />} />
          <Route path="admins" element={<AdminManagement />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="m3-card p-10 text-center">
      <h1 className="text-xl font-bold mb-2">Страницата не е намерена</h1>
      <p style={{ color: "var(--color-text-muted)" }}>Заявеният адрес не съществува.</p>
    </div>
  );
}
