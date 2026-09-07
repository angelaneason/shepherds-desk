'use client'

import React from 'react'
import { Calendar } from 'lucide-react'

interface AddToGoogleCalendarProps {
  title: string
  startTime: string | Date
  endTime?: string | Date
  allDay?: boolean
  description?: string
  location?: string
  className?: string
  variant?: 'button' | 'icon' | 'badge'
}

function formatGCalDate(date: Date, allDay?: boolean): string {
  if (allDay) {
    const y = date.getUTCFullYear()
    const m = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    return `${y}${m}${d}`
  }
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function buildGoogleCalendarUrl({
  title,
  startTime,
  endTime,
  allDay,
  description,
  location
}: {
  title: string
  startTime: string | Date
  endTime?: string | Date
  allDay?: boolean
  description?: string
  location?: string
}): string {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  let end = endTime ? (typeof endTime === 'string' ? new Date(endTime) : endTime) : new Date(start.getTime() + 60 * 60 * 1000)

  if (allDay) {
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  }

  const startFormatted = formatGCalDate(start, allDay)
  const endFormatted = formatGCalDate(end, allDay)
  const dates = `${startFormatted}/${endFormatted}`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: dates,
  })

  if (description) {
    params.set('details', description)
  }
  if (location) {
    params.set('location', location)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function AddToGoogleCalendarButton({
  title,
  startTime,
  endTime,
  allDay,
  description,
  location,
  className = '',
  variant = 'badge'
}: AddToGoogleCalendarProps) {
  const gcalUrl = buildGoogleCalendarUrl({
    title,
    startTime,
    endTime,
    allDay,
    description,
    location
  })

  if (variant === 'icon') {
    return (
      <a
        href={gcalUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Add to Google Calendar"
        className={`inline-flex items-center justify-center text-gray-400 hover:text-[#4285F4] transition-colors p-1 rounded hover:bg-blue-50 ${className}`}
      >
        <Calendar className="w-3.5 h-3.5" />
      </a>
    )
  }

  if (variant === 'button') {
    return (
      <a
        href={gcalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-blue-50 text-gray-700 hover:text-[#4285F4] shadow-sm transition-all ${className}`}
      >
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
        </svg>
        <span>Add to Google Calendar</span>
      </a>
    )
  }

  return (
    <a
      href={gcalUrl}
      target="_blank"
      rel="noopener noreferrer"
      title="1-Click export to Google Calendar"
      className={`inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:underline ${className}`}
    >
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
      </svg>
      <span>+ Google Cal</span>
    </a>
  )
}
