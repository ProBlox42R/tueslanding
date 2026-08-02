import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { api, ApiError } from "../../lib/api";
import { AdminNav } from "../../components/AdminNav";

type ScanOutcome =
  | { result: "VALID"; ticket: any }
  | { result: "ALREADY_USED"; ticket: any }
  | { result: "INVALID" };

const SCANNER_ELEMENT_ID = "qr-reader";

export function AdminScanner() {
  const [manualToken, setManualToken] = useState("");
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Store instance in ref to survive re-renders and perform cleanup cleanly
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Cleanup scanner when the component unmounts
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current?.isScanning) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function startCamera() {
    setError(null);
    try {
      if (!html5QrcodeRef.current) {
        html5QrcodeRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID);
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      };

      await html5QrcodeRef.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          // Pause/Stop scanning once a QR code is detected
          await stopCamera();
          await submitToken(decodedText);
        },
        () => {
          // Frame scan failures (normal during video playback, ignore)
        }
      );

      setScanning(true);
    } catch (err) {
      setError("Няма достъп до камерата или е възникнала грешка. Използвайте ръчно въвеждане.");
      setScanning(false);
    }
  }

  async function stopCamera() {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (err) {
        console.error("Failed to stop QR scanner:", err);
      }
    }
    setScanning(false);
  }

  async function submitToken(token: string) {
    if (!token.trim()) return;
    setError(null);
    try {
      const res = await api.post<ScanOutcome>("/scanner/validate", { token });
      setOutcome(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Възникна грешка.");
    }
  }

  return (
    <div>
      <AdminNav />
      <h1 className="text-2xl font-bold mb-6">Сканиране на билети</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="m3-card p-6">
          <h2 className="font-semibold mb-3">Камера</h2>
          
          {/* html5-qrcode attaches the camera video stream into this container */}
          <div 
            id={SCANNER_ELEMENT_ID} 
            className="w-full rounded-m3 overflow-hidden bg-black aspect-video min-h-[250px]" 
          />

          <div className="mt-3">
            {!scanning ? (
              <button className="m3-btn-filled w-full" onClick={startCamera}>
                Стартирай камерата
              </button>
            ) : (
              <button className="m3-btn-outlined w-full" onClick={stopCamera}>
                Спри камерата
              </button>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium mb-1">Ръчно въвеждане на token</label>
            <div className="flex gap-2">
              <input
                className="m3-input flex-1"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
              />
              <button
                className="m3-btn-filled shrink-0"
                onClick={() => submitToken(manualToken)}
              >
                Провери
              </button>
            </div>
          </div>
          {error && <p className="text-sm mt-3" style={{ color: "var(--color-error)" }}>{error}</p>}
        </div>

        <div className="m3-card p-6">
          <h2 className="font-semibold mb-3">Резултат</h2>
          {!outcome ? (
            <p style={{ color: "var(--color-text-muted)" }}>Все още няма сканиран билет.</p>
          ) : outcome.result === "INVALID" ? (
            <ResultBanner color="var(--color-error)" text="НЕВАЛИДЕН БИЛЕТ" />
          ) : (
            <>
              <ResultBanner
                color={outcome.result === "VALID" ? "var(--color-success)" : "var(--color-warning)"}
                text={outcome.result === "VALID" ? "БИЛЕТЪТ Е ВАЛИДЕН" : "БИЛЕТЪТ ВЕЧЕ Е ИЗПОЛЗВАН"}
              />
              <dl className="space-y-1 text-sm mt-4">
                <Row label="Притежател" value={outcome.ticket.username} />
                <Row label="Събитие" value={outcome.ticket.event_name} />
                <Row label="Зала" value={outcome.ticket.venue_name} />
                <Row label="Ред / Място" value={`${outcome.ticket.row_label} / ${outcome.ticket.seat_number}`} />
                <Row label="Тип" value={outcome.ticket.seat_type === "VIP" ? "VIP" : "Нормален"} />
                <Row label="Ticket ID" value={outcome.ticket.id} />
                {outcome.ticket.used_at && (
                  <Row label="Използван на" value={new Date(outcome.ticket.used_at).toLocaleString("bg-BG")} />
                )}
              </dl>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultBanner({ color, text }: { color: string; text: string }) {
  return (
    <div className="rounded-m3 p-6 text-center font-bold text-xl" style={{ backgroundColor: color, color: "#fff" }}>
      {text}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-1" style={{ borderColor: "var(--color-outline-variant)" }}>
      <dt style={{ color: "var(--color-text-muted)" }}>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
