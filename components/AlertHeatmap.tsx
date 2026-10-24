'use client'

import { useMemo, useState } from 'react'
import { AlertPayload } from '@/types'
import { getDailyAlertCounts, DailyAlertCount } from '@/lib/storage'

export interface AlertHeatmapProps {
  alerts?: AlertPayload[]
  contractId?: string
  days?: number
  className?: string
}

function formatTooltipDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function getLevel(count: number): number {
  if (count === 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 9) return 3
  return 4
}

function getColorClass(count: number): string {
  const level = getLevel(count)
  switch (level) {
    case 0:
      // 0 alerts: lighter / neutral background
      return 'bg-zinc-800/80 border-zinc-700/50 hover:border-zinc-500'
    case 1:
      return 'bg-emerald-950 border-emerald-900/80 hover:border-emerald-700'
    case 2:
      return 'bg-emerald-800 border-emerald-700/80 hover:border-emerald-500'
    case 3:
      return 'bg-emerald-600 border-emerald-500/80 hover:border-emerald-400'
    case 4:
    default:
      // Highest activity: darker / saturated green
      return 'bg-emerald-400 border-emerald-300 hover:border-emerald-200'
  }
}

export default function AlertHeatmap({
  alerts,
  contractId,
  days = 30,
  className = '',
}: AlertHeatmapProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const dailyCounts: DailyAlertCount[] = useMemo(() => {
    if (alerts !== undefined) {
      return getDailyAlertCounts(alerts, days)
    }
    if (contractId) {
      return getDailyAlertCounts(contractId, days)
    }
    return getDailyAlertCounts([], days)
  }, [alerts, contractId, days])

  const totalAlerts = useMemo(() => {
    return dailyCounts.reduce((sum, item) => sum + item.count, 0)
  }, [dailyCounts])

  const firstDate = dailyCounts[0]?.date ? formatTooltipDate(dailyCounts[0].date) : ''
  const lastDate = dailyCounts[dailyCounts.length - 1]?.date
    ? formatTooltipDate(dailyCounts[dailyCounts.length - 1].date)
    : ''

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with summary & legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400">
        <div>
          <span className="font-medium text-zinc-200">
            {totalAlerts} {totalAlerts === 1 ? 'alert' : 'alerts'}
          </span>{' '}
          over the past {days} days
        </div>
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <span className="text-[11px] text-zinc-500">Less</span>
          <span
            className="w-3 h-3 rounded-[2px] border bg-zinc-800/80 border-zinc-700/50"
            title="0 alerts"
          />
          <span
            className="w-3 h-3 rounded-[2px] border bg-emerald-950 border-emerald-900/80"
            title="1-2 alerts"
          />
          <span
            className="w-3 h-3 rounded-[2px] border bg-emerald-800 border-emerald-700/80"
            title="3-5 alerts"
          />
          <span
            className="w-3 h-3 rounded-[2px] border bg-emerald-600 border-emerald-500/80"
            title="6-9 alerts"
          />
          <span
            className="w-3 h-3 rounded-[2px] border bg-emerald-400 border-emerald-300"
            title="10+ alerts"
          />
          <span className="text-[11px] text-zinc-500">More</span>
        </div>
      </div>

      {/* 30-day grid of squares */}
      <div className="overflow-x-auto pb-1 pt-1">
        <div
          role="grid"
          aria-label="30-day alert activity heatmap"
          className="flex items-center justify-between gap-1.5 min-w-[480px]"
        >
          {dailyCounts.map((day, idx) => {
            const formattedDate = formatTooltipDate(day.date)
            const countLabel = `${day.count} ${day.count === 1 ? 'alert' : 'alerts'}`
            const tooltipText = `${countLabel} on ${formattedDate}`
            const level = getLevel(day.count)

            return (
              <div
                key={day.date}
                tabIndex={0}
                role="gridcell"
                aria-label={tooltipText}
                title={tooltipText}
                data-date={day.date}
                data-count={day.count}
                data-level={level}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(idx)}
                onBlur={() => setHoveredIndex(null)}
                className={`relative flex-1 aspect-square min-w-[13px] max-w-[28px] rounded-[3px] border transition-all duration-150 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 hover:scale-125 hover:z-20 ${getColorClass(
                  day.count
                )}`}
              >
                {hoveredIndex === idx && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-100 shadow-xl whitespace-nowrap z-30 pointer-events-none animate-fade-in">
                    <p className="font-semibold text-zinc-100">{countLabel}</p>
                    <p className="text-[10px] text-zinc-400">{formattedDate}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Date range footer */}
      <div className="flex justify-between items-center text-[11px] text-zinc-500 pt-0.5">
        <span>{firstDate}</span>
        <span>Today ({lastDate})</span>
      </div>
    </div>
  )
}
