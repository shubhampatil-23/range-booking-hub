import { useEffect, useState } from "react";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bookingLocationService } from "@/services/bookingLocationService";
import type { Location } from "@/types/api";

interface LocationSelectProps {
  companyBeUrl: string;
  companyToken: string;
  onSelect: (locationId: string) => void;
  onLocationDetails?: (location: Location) => void;
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
      .then((res) => {
        if (!cancelled) {
          setLocations(res.data ?? []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load locations");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyBeUrl, companyToken]);

  const handleChange = (locationId: string) => {
    onSelect(locationId);

    // Fetch full location details (slot duration, hours, etc.)
    bookingLocationService
      .getById(companyBeUrl, locationId)
      .then((loc) => onLocationDetails?.(loc))
      .catch(() => {
        /* silently ignore detail fetch errors */
      });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-3">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading locations…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-destructive py-3">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-3">
        No locations available.
      </p>
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
