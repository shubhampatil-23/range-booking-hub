import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Mail, Phone } from "lucide-react";

export interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  purpose: string;
  attendees: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
}

interface BookingFormProps {
  data: BookingFormData;
  onChange: (data: BookingFormData) => void;
}

const BookingForm = ({ data, onChange }: BookingFormProps) => {
  const update = (field: keyof BookingFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Booking Details */}
      <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-display text-base font-semibold text-foreground tracking-wide uppercase">
            Booking Details
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="purpose" className="text-primary text-sm">Purpose of Booking *</Label>
            <Textarea
              id="purpose"
              value={data.purpose}
              onChange={(e) => update("purpose", e.target.value)}
              placeholder="e.g. Practice session, Training..."
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attendees" className="text-muted-foreground text-sm">Approx. Attendees</Label>
            <Input
              id="attendees"
              type="number"
              min="1"
              value={data.attendees}
              onChange={(e) => update("attendees", e.target.value)}
              placeholder="e.g. 4"
            />
          </div>
        </div>
      </div>

      {/* Contact Details */}
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
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-muted-foreground text-sm">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="email@example.com"
                className="pl-9"
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
                placeholder="+91 99224 40163"
                required
                className="pl-9"
              />
          </div>

          {/* Address fields */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addressLine1" className="text-muted-foreground text-sm">Address Line 1</Label>
            <Input
              id="addressLine1"
              value={data.addressLine1}
              onChange={(e) => update("addressLine1", e.target.value)}
              placeholder="Street address"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addressLine2" className="text-muted-foreground text-sm">Address Line 2</Label>
            <Input
              id="addressLine2"
              value={data.addressLine2}
              onChange={(e) => update("addressLine2", e.target.value)}
              placeholder="Apt, suite, etc."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-muted-foreground text-sm">City</Label>
            <Input
              id="city"
              value={data.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="City"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="state" className="text-muted-foreground text-sm">State</Label>
            <Input
              id="state"
              value={data.state}
              onChange={(e) => update("state", e.target.value)}
              placeholder="State"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zip" className="text-muted-foreground text-sm">ZIP Code</Label>
            <Input
              id="zip"
              value={data.zip}
              onChange={(e) => update("zip", e.target.value)}
              placeholder="ZIP"
            />
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default BookingForm;
