"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  /** The selected date */
  date: Date | undefined
  /** Callback when date changes */
  onDateChange: (date: Date | undefined) => void
  /** Placeholder text when no date is selected */
  placeholder?: string
  /** Optional className for the trigger button */
  className?: string
  /** Whether the date picker is disabled */
  disabled?: boolean
  /** Minimum selectable date */
  fromDate?: Date
  /** Maximum selectable date */
  toDate?: Date
  /** Date format string (date-fns format) */
  dateFormat?: string
  /** Label to display above the picker */
  label?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
  fromDate,
  toDate,
  dateFormat = "MM/dd/yyyy",
  label,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-xs text-slate-400">{label}</label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[140px] justify-start text-left font-normal h-10",
              !date && "text-slate-500",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
            {date ? format(date, dateFormat) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              onDateChange(newDate)
              setOpen(false)
            }}
            fromDate={fromDate}
            toDate={toDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

interface DateRangePickerProps {
  /** The start date */
  startDate: Date | undefined
  /** The end date */
  endDate: Date | undefined
  /** Callback when start date changes */
  onStartDateChange: (date: Date | undefined) => void
  /** Callback when end date changes */
  onEndDateChange: (date: Date | undefined) => void
  /** Whether the pickers are disabled */
  disabled?: boolean
  /** Minimum selectable date */
  fromDate?: Date
  /** Maximum selectable date */
  toDate?: Date
  /** Date format string (date-fns format) */
  dateFormat?: string
  /** Labels for start/end pickers */
  startLabel?: string
  endLabel?: string
  /** Optional className */
  className?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  disabled = false,
  fromDate,
  toDate,
  dateFormat = "MM/dd/yyyy",
  startLabel = "Start Date",
  endLabel = "End Date",
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("flex gap-3", className)}>
      <DatePicker
        date={startDate}
        onDateChange={onStartDateChange}
        label={startLabel}
        placeholder="Start date"
        disabled={disabled}
        fromDate={fromDate}
        toDate={endDate || toDate}
        dateFormat={dateFormat}
      />
      <DatePicker
        date={endDate}
        onDateChange={onEndDateChange}
        label={endLabel}
        placeholder="End date"
        disabled={disabled}
        fromDate={startDate || fromDate}
        toDate={toDate}
        dateFormat={dateFormat}
      />
    </div>
  )
}
