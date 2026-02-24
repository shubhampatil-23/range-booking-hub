import { useEffect, useState, useRef } from "react";
import { format } from "date-fns";
import { Clock, X, Loader2 } from "lucide-react";
import { bookingAvailabilityService } from "@/services/bookingAvailabilityService";
import type { AvailabilityResponse, AvailablePeriod, BookingSchedule as BookingScheduleType } from "@/types/api";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  startISO: string;
  endISO: string;
  totalMinutes: number;
  booked: boolean;
}

/** Format a date for the backend: YYYY-MM-DDT00:00:00.000+0000 */
function toBackendDate(d: Date, end?: boolean): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return end
    ? `${yyyy}-${mm}-${dd}T23:59:59.999+0000`
    : `${yyyy}-${mm}-${dd}T00:00:00.000+0000`;
}

function formatTime12(hour: number, min: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")} ${suffix}`;
}

function generateSlotsFromDuration(
  date: Date,
  slotDurationMinutes: number,
  openHour = 8,
  closeHour = 18
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  let currentMin = openHour * 60;
  const endMin = closeHour * 60;
  let idx = 0;

  while (currentMin + slotDurationMinutes <= endMin) {
    const startH = Math.floor(currentMin / 60);
    const startM = currentMin % 60;
    const endTotal = currentMin + slotDurationMinutes;
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;

    const startISO = `${yyyy}-${mm}-${dd}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00.000+0000`;
    const endISO = `${yyyy}-${mm}-${dd}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00.000+0000`;

    slots.push({
      id: `slot-${idx}`,
      startTime: formatTime12(startH, startM),
      endTime: formatTime12(endH, endM),
      startISO,
      endISO,
      totalMinutes: slotDurationMinutes,
      booked: false,
    });

    currentMin = endTotal;
    idx++;
  }

  return slots;
}

function isSlotBooked(
  slot: TimeSlot,
  bookedPeriods: AvailablePeriod[],
  bookings: BookingScheduleType[]
): boolean {
  const sStart = new Date(slot.startISO).getTime();
  const sEnd = new Date(slot.endISO).getTime();

  for (const bp of bookedPeriods) {
    const bStart = new Date(bp.start).getTime();
    const bEnd = new Date(bp.end).getTime();
    if (sStart < bEnd && sEnd > bStart) return true;
  }

  for (const bk of bookings) {
    const bStart = new Date(bk.startTime).getTime();
    const bEnd = new Date(bk.endTime).getTime();
    if (sStart < bEnd && sEnd > bStart) return true;
  }

  return false;
}

interface SlotPickerProps {
  date: Date;
  locationId: string | null;
  companyBeUrl: string;
  slotDurationMinutes: number;
  selectedSlot: string | null;
  onSelectSlot: (slotId: string, slot: TimeSlot) => void;
}

const SlotPicker = ({
  date,
  locationId,
  companyBeUrl,
  slotDurationMinutes,
  selectedSlot,
  onSelectSlot,
}: SlotPickerProps) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!locationId) {
      setSlots([]);
      return;
    }

    // Debounce 300ms
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);

      bookingAvailabilityService
        .getByDates(companyBeUrl, {
          fromDate: toBackendDate(date),
          toDate: toBackendDate(date, true),
          locationId,
        })
        .then((res: AvailabilityResponse) => {
          const duration = res.slotDurationMinutes ?? slotDurationMinutes;
          const generated = generateSlotsFromDuration(date, duration);

          const bookedPeriods = res.bookedPeriods ?? [];
          const bookings = res.bookings ?? res.bookingSchedule ?? [];

          const withAvailability = generated.map((slot) => ({
            ...slot,
            booked: isSlotBooked(slot, bookedPeriods, bookings),
          }));

          setSlots(withAvailability);
        })
        .catch((err) => {
          setError(err?.message ?? "Failed to load availability");
          // Fallback: show generated slots without booking info
          setSlots(generateSlotsFromDuration(date, slotDurationMinutes));
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [date, locationId, companyBeUrl, slotDurationMinutes]);

  if (!locationId) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Select a location first to see available slots.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading slots…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Slots unavailable. Please try again later.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-primary">
          Available Slots for {format(date, "d MMM yyyy")}
        </p>
        <span className="text-xs text-muted-foreground">{slotDurationMinutes} min / slot</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
        {slots.map((slot, i) => {
          const isSelected = selectedSlot === slot.id;
          const isBooked = slot.booked;

          return (
            <button
              key={slot.id}
              disabled={isBooked}
              onClick={() => onSelectSlot(slot.id, slot)}
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
