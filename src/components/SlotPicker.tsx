import { format } from "date-fns";
import { Clock, X } from "lucide-react";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  booked: boolean;
}

const generateSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const startHour = 8;
  const endHour = 18;
  for (let h = startHour; h < endHour; h += 2) {
    const fmt = (hour: number) => {
      const suffix = hour >= 12 ? "PM" : "AM";
      const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${display.toString().padStart(2, "0")}:00 ${suffix}`;
    };
    slots.push({
      id: `slot-${h}`,
      startTime: fmt(h),
      endTime: fmt(h + 2),
      booked: false,
    });
  }
  return slots;
};

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
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-primary">
          Available Slots for {format(date, "d MMM yyyy")}
        </p>
        <span className="text-xs text-muted-foreground">2 hr / slot</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {slots.map((slot, i) => {
          const isSelected = selectedSlot === slot.id;
          const isBooked = slot.booked;

          return (
            <button
              key={slot.id}
              disabled={isBooked}
              onClick={() => onSelectSlot(slot.id)}
              className={`
                relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-150 animate-slot-pop
                ${
                  isBooked
                    ? "bg-slot-booked border-slot-booked-border cursor-not-allowed"
                    : isSelected
                    ? "bg-slot-selected border-slot-selected text-slot-selected-text shadow-lg scale-[1.03]"
                    : "bg-card border-border hover:border-primary hover:shadow-md cursor-pointer"
                }
              `}
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
            >
              <Clock
                className={`w-5 h-5 ${
                  isBooked
                    ? "text-destructive"
                    : isSelected
                    ? "text-slot-selected-text"
                    : "text-primary"
                }`}
              />
              <span className={`text-base font-bold ${
                isBooked ? "text-destructive" : isSelected ? "text-slot-selected-text" : "text-foreground"
              }`}>
                {slot.startTime}
              </span>
              <span className={`text-xs ${
                isBooked ? "text-slot-booked-text" : isSelected ? "text-slot-selected-text/80" : "text-muted-foreground"
              }`}>
                to {slot.endTime}
              </span>
              <span className={`text-xs font-medium flex items-center gap-1 ${
                isBooked
                  ? "text-destructive"
                  : isSelected
                  ? "text-slot-selected-text"
                  : "text-primary"
              }`}>
                {isBooked ? (
                  <><X className="w-3 h-3" /> Booked</>
                ) : isSelected ? (
                  "Selected ✓"
                ) : (
                  "Available"
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SlotPicker;
