"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatTWD } from "@/lib/currency";

export interface MonthlyTrendChartPoint {
  month: string; // YYYY-MM
  grossRevenue: number;
  treatmentCount: number;
  distinctPatientCount: number;
  newPatientCount: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendChartPoint[];
  /** If true, hides the revenue y-axis (used when doctor view is limited). */
  hideRevenue?: boolean;
}

/**
 * Dual-axis bar/line chart: revenue bars (left axis, TWD) + patient
 * count lines (right axis). 12-month window typically.
 */
export function MonthlyTrendChart({ data, hideRevenue = false }: MonthlyTrendChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#737373" }}
            tickFormatter={(value: string) => {
              // "2026-04" → "4月"
              const parts = value.split("-");
              return `${Number(parts[1])}月`;
            }}
          />
          {!hideRevenue && (
            <YAxis
              yAxisId="revenue"
              tick={{ fontSize: 11, fill: "#737373" }}
              tickFormatter={(value: number) =>
                value >= 10000 ? `${Math.round(value / 1000)}k` : String(value)
              }
            />
          )}
          <YAxis
            yAxisId="patients"
            orientation="right"
            tick={{ fontSize: 11, fill: "#737373" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 6,
              borderColor: "#e5e5e5",
            }}
            formatter={(value, name) => {
              const numericValue = typeof value === "number" ? value : 0;
              if (name === "本月收入") return [formatTWD(numericValue), name];
              return [String(numericValue), name];
            }}
            labelFormatter={(label) => {
              if (typeof label !== "string") return "";
              const [y, m] = label.split("-");
              return `${y} 年 ${Number(m)} 月`;
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {!hideRevenue && (
            <Bar
              yAxisId="revenue"
              dataKey="grossRevenue"
              name="本月收入"
              fill="#6A5BA3"
              radius={[4, 4, 0, 0]}
              barSize={24}
            />
          )}
          <Line
            yAxisId="patients"
            type="monotone"
            dataKey="distinctPatientCount"
            name="不同病人數"
            stroke="#1D697C"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="patients"
            type="monotone"
            dataKey="newPatientCount"
            name="新病人數"
            stroke="#ED6D3D"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
