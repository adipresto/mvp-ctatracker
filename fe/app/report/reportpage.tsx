import { useState, useEffect } from "react";
import { useNavigate } from "react-router";

interface RevenueEvent {
  channel: string;
  amount: number;
  time: number;
}

export default function ReportPage() {
  const [data, setData] = useState<RevenueEvent[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/track/revenue")
      .then((res) => res.json())
      .then((result) => setData(result))
      .catch((err) => console.error("Failed to load report:", err));
  }, []);

  const totals = data.reduce<Record<string, number>>((acc, cur) => {
    acc[cur.channel] = (acc[cur.channel] || 0) + cur.amount;
    return acc;
  }, {});

  return (
    <div className="p-8 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Revenue Report</h1>
      <p className="text-gray-600">Data dari API backend:</p>

      <div className="bg-white rounded-lg shadow p-4">
        {Object.keys(totals).length === 0 ? (
          <p className="text-gray-500">Belum ada data revenue.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Channel</th>
                <th className="text-left py-2">Revenue ($)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(totals).map(([channel, total]) => (
                <tr key={channel} className="border-b">
                  <td className="py-2">{channel}</td>
                  <td className="py-2">{total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button
        className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg"
        onClick={() => navigate("/")}
      >
        Back to Home
      </button>
    </div>
  );
}
