import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from "recharts";

type RevenueEvent = {
  channel: string;
  cta_id: string;
  amount: number;
  transaction_id: string;
  utm: Record<string, string | null>;
  page: string;
  timestamp: number;
};

type PaginatedResponse = {
  data: RevenueEvent[];
  totals: Record<string, number>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function ReportPage() {
  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [filterPeriod, setFilterPeriod] = useState<"all" | "7d" | "30d">("all");
  const [filterUTM, setFilterUTM] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [utmCampaigns, setUtmCampaigns] = useState<string[]>([]);

  const fetchEvents = async () => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      pageSize: pageSize.toString(),
      period: filterPeriod,
      utm_campaign: filterUTM,
    });

    const res = await fetch(`/api/track/revenue?${params.toString()}`);
    const json: PaginatedResponse = await res.json();

    setEvents(json.data ?? []);
    setTotals(json.totals ?? {});
    setTotalPages(json.totalPages ?? 1);
  };

  // Ambil semua campaign unik (sekali)
  useEffect(() => {
    fetch("/api/track/revenue")
      .then(res => res.json())
      .then((json: PaginatedResponse) => {
        const campaigns = Array.from(
          new Set((json.data ?? []).map(e => e.utm?.utm_campaign).filter(Boolean))
        );
        setUtmCampaigns(campaigns as string[]);
      });
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [currentPage, filterPeriod, filterUTM]);

  const formatCurrency = (val: number) =>
    `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const maxRevenue = Math.max(...Object.values(totals), 0);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-4">📊 Revenue Performance Dashboard</h1>

      {/* Filters */}
      <section className="flex gap-4 items-center">
        <div>
          <label className="mr-2 font-semibold">Period:</label>
          <select
            className="border px-2 py-1 rounded"
            value={filterPeriod}
            onChange={(e) => { setFilterPeriod(e.target.value as any); setCurrentPage(1); }}
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        <div>
          <label className="mr-2 font-semibold">Campaign:</label>
          <select
            className="border px-2 py-1 rounded"
            value={filterUTM}
            onChange={(e) => { setFilterUTM(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">All Campaigns</option>
            {(utmCampaigns || []).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Total Revenue per Channel */}
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
            {Object.entries(totals || {}).map(([channel, amount]) => (
              <tr key={channel} className={amount === maxRevenue ? "bg-green-100 font-semibold" : ""}>
                <td className="border px-4 py-2">{channel}</td>
                <td className="border px-4 py-2 text-right">{formatCurrency(amount)}</td>
              </tr>
            ))}
            {Object.keys(totals || {}).length === 0 && (
              <tr>
                <td colSpan={2} className="text-center p-4 text-gray-400">No data</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Chart */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Revenue Chart</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={Object.entries(totals || {}).map(([channel, amount]) => ({ channel, amount }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="channel" />
              <YAxis />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Revenue Event History */}
      <section>
        <h2 className="text-xl font-semibold mb-2">Revenue Event History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left">Channel</th>
                <th className="border px-4 py-2 text-left">CTA ID</th>
                <th className="border px-4 py-2 text-left">Transaction ID</th>
                <th className="border px-4 py-2 text-left">Page</th>
                <th className="border px-4 py-2 text-left">UTM Source</th>
                <th className="border px-4 py-2 text-right">Amount ($)</th>
                <th className="border px-4 py-2 text-left">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {(events || []).map((e, i) => (
                <tr key={i}>
                  <td className="border px-4 py-2">{e.channel}</td>
                  <td className="border px-4 py-2">{e.cta_id}</td>
                  <td className="border px-4 py-2">{e.transaction_id}</td>
                  <td className="border px-4 py-2">{e.page}</td>
                  <td className="border px-4 py-2">{e.utm?.utm_source || "-"}</td>
                  <td className="border px-4 py-2 text-right">{formatCurrency(e.amount)}</td>
                  <td className="border px-4 py-2">{new Date(e.timestamp).toLocaleString()}</td>
                </tr>
              ))}
              {(events || []).length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-gray-400">No event data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

