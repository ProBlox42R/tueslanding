import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Липсва token за потвърждение.");
      return;
    }
    api
      .post<{ message: string }>("/auth/verify-email", { token })
      .then((res) => {
        setStatus("ok");
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiError ? err.message : "Възникна грешка.");
      });
  }, [params]);

  return (
    <div className="max-w-md mx-auto m3-card p-8 text-center">
      <h1 className="text-xl font-bold mb-4">Потвърждение на имейл</h1>
      {status === "loading" && <p>Проверяваме линка...</p>}
      {status !== "loading" && (
        <p style={{ color: status === "ok" ? "var(--color-success)" : "var(--color-error)" }}>
          {message}
        </p>
      )}
      <Link to="/login" className="m3-btn-filled inline-block mt-6">Към вход</Link>
    </div>
  );
}
