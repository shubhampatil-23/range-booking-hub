import { useState } from "react";
import { format } from "date-fns";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  booked: boolean;
}

const generateSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const startHour = 8;
  const endHour = 18;
  for (let h = startHour; h < endHour; h += 2) {
    const start = h;
    const end = h + 2;
    const fmt = (hour: number) => {
      const suffix = hour >= 12 ? "PM" : "AM";
      const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${display}:00 ${suffix}`;
    };
    slots.push({
      id: `slot-${h}`,
      startTime: fmt(start),
      endTime: fmt(end),
      label: `${fmt(start)} – ${fmt(end)}`,
      booked: false,
    });
  }
  return slots;
};

// Simulate some booked slots per date
const getBookedSlotIds = (date: Date): string[] => {
  const day = date.getDate();
  if (day % 3 === 0) return ["slot-10", "slot-14"];
  if (day % 5 === 0) return ["slot-8", "slot-12", "slot-16"];
  if (day % 2 === 0) return ["slot-14"];
  return [];
};

interface SlotPickerProps {
  date: Date;
  selectedSlot: string | null;
  onSelectSlot: (slotId: string) => void;
}

const SlotPicker = ({ date, selectedSlot, onSelectSlot }: SlotPickerProps) => {
  const baseSlots = generateSlots();
  const bookedIds = getBookedSlotIds(date);
  const slots = baseSlots.map((s) => ({
    ...s,
    booked: bookedIds.includes(s.id),
  }));

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground mb-1">
        Slots for {format(date, "EEEE, MMM d")}
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Open Hours: 8:00 AM – 6:00 PM · Slot Duration: 2 hrs
      </p>
      <div className="grid grid-cols-1 gap-2">
        {slots.map((slot, i) => {
          const isSelected = selectedSlot === slot.id;
          const isBooked = slot.booked;

          return (
            <button
              key={slot.id}
              disabled={isBooked}
              onClick={() => onSelectSlot(slot.id)}
              className={`
                relative flex items-center justify-between px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all duration-150 animate-slot-pop
                ${
                  isBooked
                    ? "bg-slot-booked border-slot-booked-border text-slot-booked-text cursor-not-allowed opacity-60"
                    : isSelected
                    ? "bg-slot-selected border-slot-selected text-slot-selected-text shadow-md scale-[1.02]"
                    : "bg-slot-available border-slot-available-border text-slot-available-text hover:border-primary hover:shadow-sm cursor-pointer"
                }
              `}
              style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
            >
              <span className="font-semibold">{slot.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isBooked
                  ? "bg-destructive/10 text-destructive"
                  : isSelected
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary/10 text-primary"
              }`}>
                {isBooked ? "Booked" : isSelected ? "Selected ✓" : "Available"}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slot-available border border-slot-available-border" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slot-booked border border-slot-booked-border" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slot-selected" /> Selected
        </span>
      </div>
    </div>
  );
};

export default SlotPicker;
