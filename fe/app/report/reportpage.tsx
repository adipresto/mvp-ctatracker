import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

type RevenueEvent = {
  channel: string;
  amount: number;
  timestamp: number;
};

export default function ReportPage() {
  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});

  useEffect(() => {
    // Fetch all events (histori)
    fetch("/api/track/revenue")
      .then(res => res.json())
      .then((data: RevenueEvent[]) => {
        setEvents(Array.isArray(data) ? data : []);

        // Hitung total per channel
        const totalMap = data.reduce<Record<string, number>>((acc, cur) => {
          acc[cur.channel] = (acc[cur.channel] || 0) + cur.amount;
          return acc;
        }, {});
        setTotals(totalMap);
      })
      .catch(console.error);
  }, []);

  // Ubah data totals ke format chart-friendly
  const chartData = Object.entries(totals).map(([channel, amount]) => ({
    channel,
    amount,
  }));

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">📊 Revenue Performance Dashboard</h1>

      {/* ===================== TABEL TOTAL ===================== */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Total Revenue per Channel</h2>
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Channel</th>
              <th className="border px-4 py-2 text-right">Total Revenue ($)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(totals).map(([channel, amount]) => (
              <tr key={channel}>
                <td className="border px-4 py-2">{channel}</td>
                <td className="border px-4 py-2 text-right">{amount.toFixed(2)}</td>
              </tr>
            ))}
            {Object.keys(totals).length === 0 && (
              <tr>
                <td colSpan={2} className="text-center p-4 text-gray-400">No data yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* ===================== CHART ===================== */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Revenue Chart</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ===================== TABEL HISTORI ===================== */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Revenue Event History</h2>
        <table className="min-w-full border border-gray-300 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Channel</th>
              <th className="border px-4 py-2 text-right">Amount ($)</th>
              <th className="border px-4 py-2 text-left">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i}>
                <td className="border px-4 py-2">{e.channel}</td>
                <td className="border px-4 py-2 text-right">{e.amount.toFixed(2)}</td>
                <td className="border px-4 py-2">{new Date(e.timestamp).toLocaleString()}</td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center p-4 text-gray-400">No event data</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

