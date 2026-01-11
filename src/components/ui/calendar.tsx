"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/**
 * Calendar component styled for SeismiStats dark glassmorphism theme.
 * "Today" highlighting is intentionally disabled since all dates are UTC-based.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("rdp-dark", className)}
      classNames={classNames}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
