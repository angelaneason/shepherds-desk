import { format, startOfWeek, parseISO, addDays } from 'date-fns'

export const DAY_MAP = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

/** Local-time YYYY-MM-DD key (avoids UTC day-shift for evening events). */
export function localDayKey(d: Date | string): string {
  return format(typeof d === 'string' ? parseISO(d) : d, 'yyyy-MM-dd')
}

/**
 * Expand a calendar event with a recurrence_rule (FREQ=DAILY|WEEKLY|MONTHLY,
 * INTERVAL, BYDAY, EXDATE) into concrete occurrences within [startRange, endRange].
 * Non-recurring events are returned as-is.
 */
export function expandEvent(event: any, startRange: Date, endRange: Date): any[] {
  if (!event.recurrence_rule) return [event]

  const rule: any = {}
  event.recurrence_rule.split(';').forEach((part: string) => {
    const [k, v] = part.split('=')
    if (k && v) rule[k] = v
  })

  const exdates = rule.EXDATE ? rule.EXDATE.split(',') : []

  const results: any[] = []
  const eventStart = parseISO(event.start_time)
  const eventEnd = parseISO(event.end_time)
  const duration = eventEnd.getTime() - eventStart.getTime()

  let current = new Date(eventStart)
  let iterations = 0

  // Just to avoid infinite loops, we bound by endRange + some buffer
  const absoluteEnd = new Date(endRange)
  absoluteEnd.setFullYear(absoluteEnd.getFullYear() + 1)
  const limitDate = new Date(Math.min(absoluteEnd.getTime(), endRange.getTime() + 30 * 24 * 60 * 60 * 1000))

  while (current <= limitDate && iterations < 2000) {
    const currentIsoDate = format(current, 'yyyyMMdd')
    let matches = false

    if (!exdates.includes(currentIsoDate)) {
      if (rule.FREQ === 'DAILY') {
        matches = true
      } else if (rule.FREQ === 'WEEKLY') {
        const interval = rule.INTERVAL ? parseInt(rule.INTERVAL) : 1

        const currentStartOfWeek = startOfWeek(current)
        const eventStartOfWeek = startOfWeek(eventStart)

        const weeksDiff = Math.floor((currentStartOfWeek.getTime() - eventStartOfWeek.getTime()) / (7 * 24 * 60 * 60 * 1000))

        if (weeksDiff >= 0 && weeksDiff % interval === 0) {
          if (rule.BYDAY) {
             const days = rule.BYDAY.split(',')
             if (days.includes(DAY_MAP[current.getDay()])) {
               matches = true
             }
          } else {
             if (current.getDay() === eventStart.getDay()) matches = true
          }
        }
      } else if (rule.FREQ === 'MONTHLY') {
        if (current.getDate() === eventStart.getDate()) matches = true
      }
    }

    if (matches && current >= startRange && current <= endRange) {
      const newStart = new Date(current)
      newStart.setHours(eventStart.getHours(), eventStart.getMinutes(), eventStart.getSeconds(), eventStart.getMilliseconds())
      const newEnd = new Date(newStart.getTime() + duration)
      results.push({ ...event, start_time: newStart.toISOString(), end_time: newEnd.toISOString(), id: `${event.id}_${newStart.getTime()}` })
    }

    current = addDays(current, 1)
    iterations++
  }
  return results
}
