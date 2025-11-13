import { useNavigate } from "react-router";

// === tracker logic disisipkan di dalam file ini ===
const tracker = {
  async trackRevenue(channel: string, amount: number) {
    const payload = {
      channel,
      amount,
      timestamp: Date.now(),
    };

    try {
      // fire-and-forget, gunakan navigator.sendBeacon jika tersedia
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        });
        navigator.sendBeacon("/api/track/revenue", blob);
        console.log("[tracker] sent via Beacon:", payload);
      } else {
        await fetch("/api/track/revenue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        console.log("[tracker] sent via Fetch:", payload);
      }
    } catch (err) {
      console.error("[tracker] failed:", err);
      // opsional: simpan lokal untuk dikirim ulang nanti
    }
  },
};
// === end tracker logic ===

const channels = [
  { name: "Facebook", revenue: 120 },
  { name: "Google", revenue: 200 },
  { name: "Email", revenue: 75 },
];

export default function HomePage() {
  const navigate = useNavigate();

  const handleCTA = async (channel: string, amount: number) => {
    await tracker.trackRevenue(channel, amount);
    alert(`Revenue from ${channel} sent: $${amount}`);
  };

  return (
    <div className="p-8 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Performance Tracker</h1>
      <p className="text-gray-600">Klik tombol untuk mengirim event revenue:</p>

      <div className="flex flex-col gap-2">
        {channels.map((c) => (
          <button
            key={c.name}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={() => handleCTA(c.name, c.revenue)}
          >
            Buy via {c.name} (${c.revenue})
          </button>
        ))}
      </div>

      <button
        className="mt-6 px-4 py-2 bg-gray-800 text-white rounded-lg"
        onClick={() => navigate("/report")}
      >
        View Report
      </button>
    </div>
  );
}

