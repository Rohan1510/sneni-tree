import React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// A dark, glass, gold-accent themed calendar that matches the app aesthetic.
export default function DarkCalendar({ className, classNames, ...props }) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-3 font-manrope", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-3",
        caption: "flex justify-center pt-1 relative items-center text-white/90",
        caption_label: "font-cormorant text-base tracking-tight",
        caption_dropdowns: "flex gap-2",
        dropdown:
          "bg-white/5 border border-white/10 text-white text-xs rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]",
        dropdown_month: "bg-white/5",
        dropdown_year: "bg-white/5",
        vhidden: "sr-only",
        nav: "space-x-1 flex items-center",
        nav_button:
          "h-7 w-7 inline-flex items-center justify-center rounded-md text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-[#D4AF37] transition-colors",
        nav_button_previous: "absolute left-2",
        nav_button_next: "absolute right-2",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "text-white/40 rounded-md w-9 h-7 flex items-center justify-center font-normal text-[10px] tracking-[0.2em] uppercase",
        row: "flex w-full mt-1.5",
        cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:rounded-md",
        day: "h-9 w-9 p-0 font-normal text-white/80 rounded-full inline-flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors aria-selected:opacity-100",
        day_selected:
          "!bg-[#D4AF37] !text-black hover:!bg-[#E5C07B] hover:!text-black focus:!bg-[#D4AF37] focus:!text-black",
        day_today: "ring-1 ring-[#D4AF37]/40 text-white",
        day_outside: "text-white/20 aria-selected:text-white/40",
        day_disabled: "text-white/15 opacity-40",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
