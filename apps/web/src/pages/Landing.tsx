import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";

interface EventRow {
  id: string;
  name: string;
  start_date: string;
  normal_price: string;
  vip_price: string | null;
}

export function Landing() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get<{ events: EventRow[] }>("/events").then((res) => setEvents(res.events.slice(0, 3)));
  }, []);

  return (
    <div className="flex flex-col gap-20 sm:gap-28">
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden -mt-6 sm:-mt-8 pt-16 sm:pt-24 pb-10 sm:pb-16 px-4 rounded-b-m3-lg">
        <HeroBackdrop />

        <div className="relative max-w-3xl mx-auto text-center">
          <span className="m3-chip mb-6" style={{ color: "var(--color-brand)", borderColor: "var(--color-brand)" }}>
            🎟️ Билети на живо, без опашки
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Купи билет,{" "}
            <span
              style={{
                backgroundImage: "linear-gradient(135deg, var(--color-brand) 0%, #e05650 60%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              избери мястото си
            </span>
            , не чакай на вратата.
          </h1>
          <p className="text-lg sm:text-xl mb-10" style={{ color: "var(--color-text-muted)" }}>
            Наличността се обновява в реално време, билетът пристига с QR код на секундата,
            и всичко работи перфектно от телефона ти.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/events" className="m3-btn-filled text-base px-8 py-3.5">
              Разгледай събития
            </Link>
            {user ? (
              <Link to="/my-tickets" className="m3-btn-outlined text-base px-8 py-3.5">
                Моите билети
              </Link>
            ) : (
              <Link to="/register" className="m3-btn-outlined text-base px-8 py-3.5">
                Създай безплатен акаунт
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ---- Feature grid ---- */}
      <section className="max-w-6xl mx-auto w-full px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Защо „Билети“</h2>
        <p className="text-center mb-12" style={{ color: "var(--color-text-muted)" }}>
          Изградено за истинско натоварване в деня на събитието — не само за демо.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<BoltIcon />}
            title="На живо, наистина"
            text="Схемата на залата се обновява в реално време — виждаш свободните места веднага, без refresh."
          />
          <FeatureCard
            icon={<LockIcon />}
            title="Без свръхпродажба"
            text="Две резервации за едно място никога не се случват — базата данни го гарантира на ниво транзакция."
          />
          <FeatureCard
            icon={<QrIcon />}
            title="QR билет за секунди"
            text="След покупката PDF билетът с уникален QR код те чака в профила и в пощата ти."
          />
          <FeatureCard
            icon={<PhoneIcon />}
            title="Мобилен от старта"
            text="Избор на места, checkout, и дори сканирането на входа — всичко удобно от телефон."
          />
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="max-w-4xl mx-auto w-full px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Как работи</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          <Step number={1} title="Избери място">
            Разгледай схемата на залата и си избери точното място — нормално или VIP.
          </Step>
          <Step number={2} title="Потвърди с едно име">
            Без карти. Само името за билета — резервацията ти чака 10 минути.
          </Step>
          <Step number={3} title="Влез с QR код">
            Билетът пристига веднага, с QR код за бързо и сигурно сканиране на входа.
          </Step>
        </div>
      </section>

      {/* ---- Upcoming events teaser ---- */}
      {events && events.length > 0 && (
        <section className="max-w-6xl mx-auto w-full px-4">
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold">Предстоящи събития</h2>
            <Link to="/events" className="m3-btn-text text-sm shrink-0">
              Виж всички →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {events.map((ev) => (
              <Link key={ev.id} to={`/events/${ev.id}`} className="m3-card p-5">
                <h3 className="font-semibold mb-1">{ev.name}</h3>
                <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(ev.start_date).toLocaleDateString("bg-BG", { day: "numeric", month: "long" })}
                </p>
                <span className="m3-chip">от {ev.normal_price} лв.</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---- Final CTA ---- */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-4">
        <div
          className="rounded-m3-lg p-10 sm:p-14 text-center"
          style={{
            background: "linear-gradient(135deg, var(--color-brand) 0%, #e05650 100%)",
            color: "#ffffff",
          }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Готов ли си?</h2>
          <p className="mb-8 opacity-90">Разгледай какво предстои и си запази място, преди да свършат билетите.</p>
          <Link
            to={user ? "/my-tickets" : "/events"}
            className="inline-block px-8 py-3.5 rounded-m3-full font-semibold"
            style={{ backgroundColor: "#ffffff", color: "var(--color-brand)" }}
          >
            {user ? "Към моите билети" : "Разгледай събития"}
          </Link>
        </div>
      </section>
    </div>
  );
}

function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: "var(--color-brand)" }}
      />
      <div
        className="absolute top-10 -right-16 w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: "var(--color-brand)" }}
      />
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="m3-card p-6">
      <div
        className="w-11 h-11 rounded-m3 flex items-center justify-center mb-4"
        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-brand-on)" }}
      >
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        {text}
      </p>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold mx-auto mb-4"
        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-brand-on)" }}
      >
        {number}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        {children}
      </p>
    </div>
  );
}

function BoltIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}
