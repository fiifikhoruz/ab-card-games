'use client'

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Filler, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Filler, Legend
)

interface RevenueChartProps {
  data: { date: string; revenue: number }[]
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const chartData = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Revenue (GHS)',
        data: data.map(d => d.revenue),
        fill: true,
        borderColor: '#D4AF37',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx
          const gradient = ctx.createLinearGradient(0, 0, 0, 200)
          gradient.addColorStop(0, 'rgba(212,175,55,0.25)')
          gradient.addColorStop(1, 'rgba(212,175,55,0)')
          return gradient
        },
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#D4AF37',
        pointBorderColor: '#0A0A0A',
        pointBorderWidth: 2,
        tension: 0.4,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1A1A1A',
        borderColor: '#3D3D3D',
        borderWidth: 1,
        titleColor: '#8A8A8A',
        bodyColor: '#FFFFFF',
        padding: 12,
        callbacks: {
          label: (ctx: any) => `GHS ${ctx.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#5C5C5C', font: { size: 11 } },
      },
      y: {
        grid: { color: '#1A1A1A', lineWidth: 1 },
        border: { display: false },
        ticks: {
          color: '#5C5C5C',
          font: { size: 11 },
          callback: (v: any) => `₵${v.toLocaleString()}`,
        },
      },
    },
  }

  return (
    <div style={{ height: 220 }}>
      <Line data={chartData} options={options} />
    </div>
  )
}
