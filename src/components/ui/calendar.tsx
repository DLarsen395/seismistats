"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
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
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-slate-200",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-slate-800 border border-slate-600 p-0 text-slate-400",
          "hover:text-white hover:bg-slate-700 hover:border-slate-500",
          "rounded-md transition-colors inline-flex items-center justify-center"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-slate-500 rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "h-9 w-9",
          "[&:has([aria-selected])]:bg-blue-600/30 [&:has([aria-selected])]:rounded-md"
        ),
        day: cn(
          "h-9 w-9 p-0 font-normal rounded-md transition-colors inline-flex items-center justify-center",
          "text-slate-300 hover:bg-slate-700 hover:text-white",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-slate-900",
          "aria-selected:opacity-100"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-blue-600 text-white hover:bg-blue-500 hover:text-white",
          "focus:bg-blue-600 focus:text-white"
        ),
        day_today: "", // No special styling - all dates are UTC
        day_outside: "text-slate-600 opacity-50",
        day_disabled: "text-slate-700 opacity-30 cursor-not-allowed",
        day_range_middle: "aria-selected:bg-blue-600/20 aria-selected:text-slate-200",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className="h-4 w-4" />
          }
          return <ChevronRightIcon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
