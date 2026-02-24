import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bookingLocationService } from "@/services/bookingLocationService";
import type { Location } from "@/types/api";
import { getSlotDuration } from "@/types/api";

interface LocationSelectProps {
  companyBeUrl: string;
  companyToken: string;
  onSelect: (locationId: string, locationName: string) => void;
  onLocationDetails?: (location: Location, slotDurationMinutes: number) => void;
}

const LocationSelect = ({
  companyBeUrl,
  companyToken,
  onSelect,
  onLocationDetails,
}: LocationSelectProps) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    bookingLocationService
      .getAllLocationsForBooking(companyBeUrl, companyToken)
      .then((locs) => {
        if (!cancelled) setLocations(locs);
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [companyBeUrl, companyToken]);

  const handleChange = (locationId: string) => {
    const loc = locations.find((l) => l.id === locationId);
    onSelect(locationId, loc?.locationName ?? "");

    // Pass location from getbyurltoken list immediately (has locationHours, slotDuration)
    if (loc) onLocationDetails?.(loc, getSlotDuration(loc));

    // Optionally fetch full details to refresh
    bookingLocationService
      .getById(companyBeUrl, locationId)
      .then((detail) => {
        onLocationDetails?.(detail, getSlotDuration(detail));
      })
      .catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-3">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading locations…</span>
      </div>
    );
  }

  if (error || locations.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full opacity-60">
          <SelectValue placeholder={loading ? "Loading locations…" : "No locations available"} />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }


  return (
    <Select onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select shooting range location" />
      </SelectTrigger>
      <SelectContent>
        {locations.map((loc) => (
          <SelectItem key={loc.id} value={loc.id}>
            {loc.locationName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LocationSelect;
