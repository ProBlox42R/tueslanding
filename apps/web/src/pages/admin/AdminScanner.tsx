import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { api, ApiError } from "../../lib/api";
import { AdminNav } from "../../components/AdminNav";

type ScanOutcome =
  | { result: "VALID"; ticket: any }
  | { result: "ALREADY_USED"; ticket: any }
  | { result: "INVALID" };

export function AdminScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false); // спира допълнителни сканирания докато чакаме отговор от backend-а

  const [manualToken, setManualToken] = useState("");
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      busyRef.current = false;
      tick();
    } catch {
      setCameraError("Няма достъп до камерата. Използвайте ръчно въвеждане по-долу.");
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const stream = videoRef.current?.srcObject as MediaStream | undefined;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }

  // Canvas-базирано декодиране с jsQR — чист JS, работи във всеки браузър с
  // камера (за разлика от нативния BarcodeDetector API, който се поддържа
  // само в Chrome на Android/ChromeOS и липсва почти навсякъде другаде).
  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    if (video.readyState !== video.HAVE_ENOUGH_DATA || busyRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code && code.data) {
        busyRef.current = true;
        submitToken(code.data).finally(() => {
          // Малка пауза преди следващото сканиране, за да не "стреля" веднага
          // по същия код втори път, докато е все още пред камерата.
          setTimeout(() => {
            busyRef.current = false;
          }, 1500);
        });
      }
    } catch {
      // игнорирай отделни неуспешни кадри
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  async function submitToken(token: string) {
    setError(null);
    try {
      const res = await api.post<ScanOutcome>("/scanner/validate", { token: token.trim() });
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

          <div className="relative w-full rounded-m3 overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-2/3 aspect-square rounded-m3"
                  style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)", border: "2px solid #ffffff" }}
                />
              </div>
            )}
          </div>

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
          {cameraError && <p className="text-sm mt-3" style={{ color: "var(--color-error)" }}>{cameraError}</p>}

          <div className="mt-6">
            <label className="block text-sm font-medium mb-1">Ръчно въвеждане на token</label>
            <div className="flex gap-2">
              <input
                className="m3-input"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitToken(manualToken)}
              />
              <button className="m3-btn-filled shrink-0" onClick={() => submitToken(manualToken)}>
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
                <Row label="Притежател" value={outcome.ticket.buyer_name ?? outcome.ticket.username} />
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
