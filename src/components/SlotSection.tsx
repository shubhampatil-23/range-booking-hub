import { useState } from "react";
import { Crosshair, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import SlotPicker, { type TimeSlot } from "@/components/SlotPicker";
import type { Location } from "@/types/api";

interface SlotSectionProps {
  date: Date;
  locationId: string | null;
  location: Location | null;
  companyBeUrl: string;
  slotDurationMinutes: number;
  selectedSlot: string | null;
  onSelectSlot: (slotId: string, slot: TimeSlot) => void;
}

const SlotSection = ({
  date,
  locationId,
  location,
  companyBeUrl,
  slotDurationMinutes,
  selectedSlot,
  onSelectSlot,
}: SlotSectionProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-primary" />
          <h2 className="font-display text-base font-semibold uppercase tracking-wider text-foreground">
            Pick Your Slot
          </h2>
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-200",
            collapsed && "-rotate-90"
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          collapsed ? "max-h-0 mt-0 opacity-0" : "max-h-[2000px] mt-4 opacity-100"
        )}
      >
        <SlotPicker
          date={date}
          locationId={locationId}
          location={location}
          companyBeUrl={companyBeUrl}
          slotDurationMinutes={slotDurationMinutes}
          selectedSlot={selectedSlot}
          onSelectSlot={onSelectSlot}
        />
      </div>
    </div>
  );
};

export default SlotSection;
