import { useState } from "react";
import { useNavigate } from "react-router";

// === tracker logic disisipkan di dalam file ini ===
const tracker = {
  async trackRevenue(params: {
    channel: string;
    cta_id: string;
    amount: number;
    utm?: Record<string, string>; // optional, ambil dari URL
  }) {
    const { channel, cta_id, amount, utm } = params;

    const payload = {
      channel,
      cta_id,
      amount,
      utm: utm || getUTMParams(),
      transaction_id: crypto.randomUUID(),
      page: window.location.pathname,
      timestamp: Date.now(),
    };

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/track/revenue", blob);
      } else {
        await fetch("/api/track/revenue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      console.log("[tracker] sent:", payload);
      return true;
    } catch (err) {
      console.error("[tracker] failed:", err);
      return false;
    }
  },
};

// helper untuk ambil UTM dari URL
function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || null,
    utm_medium: params.get("utm_medium") || null,
    utm_campaign: params.get("utm_campaign") || null,
    utm_content: params.get("utm_content") || null,
    utm_term: params.get("utm_term") || null,
  };
}
// === end tracker logic ===

const channels = [
  { name: "Facebook", revenue: 120 },
  { name: "Google", revenue: 200 },
  { name: "Email", revenue: 75 },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [loadingCTA, setLoadingCTA] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const handleCTA = async (channel: string, cta_id: string, amount: number) => {
    setLoadingCTA(cta_id);

    const success = await tracker.trackRevenue({ channel, cta_id, amount });

    if (success) {
      setToast(`Revenue dari ${channel} (${cta_id}) berhasil dikirim: $${amount}`);
    } else {
      setToast(`Gagal mengirim revenue dari ${channel}`);
    }

    setTimeout(() => setToast(null), 3000);
    setLoadingCTA(null);
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <div className="p-8 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Performance Tracker</h1>
      <p className="text-gray-600">Klik tombol untuk mengirim event revenue:</p>

      <div className="flex flex-col gap-2">
        {channels.map((c) => {
          const cta_id = `cta_${c.name.toLowerCase()}`;
          return (
            <button
              key={c.name}
              className={`px-4 py-2 rounded-lg text-white ${loadingCTA === cta_id
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
                }`}
              disabled={loadingCTA === cta_id}
              onClick={() => handleCTA(c.name, cta_id, c.revenue)}
            >
              {loadingCTA === cta_id
                ? `Processing...`
                : `Buy via ${c.name} (${formatCurrency(c.revenue)})`}
            </button>
          );
        })}
      </div>

      <button
        className="mt-6 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
        onClick={() => navigate("/report")}
      >
        View Report
      </button>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

