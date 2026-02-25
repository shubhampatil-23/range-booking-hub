import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Users, Mail, Phone } from "lucide-react";

export interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  purpose: string;
  attendees: string;
  city: string;
}

interface BookingFormProps {
  data: BookingFormData;
  onChange: (data: BookingFormData) => void;
  invalidField?: string | null;
  onFieldChange?: (field: keyof BookingFormData) => void;
}

function BookingForm({ data, onChange, invalidField, onFieldChange }: BookingFormProps) {
  const update = (field: keyof BookingFormData, value: string) => {
    onFieldChange?.(field);
    onChange({ ...data, [field]: value });
  };

  const err = invalidField ? "border-destructive ring-2 ring-destructive ring-offset-2" : "";

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="purpose" className="text-primary text-sm">Purpose *</Label>
            <Input
              id="purpose"
              value={data.purpose}
              onChange={(e) => update("purpose", e.target.value)}
              placeholder="Practice, Training..."
              maxLength={20}
              required
              className={cn(invalidField === "purpose" ? err : "")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attendees" className="text-muted-foreground text-sm">Attendees</Label>
            <Input
              id="attendees"
              type="number"
              min="1"
              value={data.attendees}
              onChange={(e) => update("attendees", e.target.value)}
              placeholder="1"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-display text-base font-semibold text-foreground tracking-wide uppercase">
            Contact Details
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-primary text-sm">First Name *</Label>
            <Input
              id="firstName"
              value={data.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              placeholder="First name"
              required
              className={invalidField === "firstName" ? err : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-muted-foreground text-sm">Last Name</Label>
            <Input
              id="lastName"
              value={data.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              placeholder="Last name"
            />
          </div>
          <div className="space-y-1.5 sm:col-start-1">
            <Label htmlFor="city" className="text-muted-foreground text-sm">City</Label>
            <Input
              id="city"
              value={data.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="City"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-muted-foreground text-sm">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="Email"
                className={cn("pl-9", invalidField === "email" ? err : "")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-primary text-sm">Phone *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="Phone number"
                required
                className={cn("pl-9", invalidField === "phone" ? err : "")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingForm;
