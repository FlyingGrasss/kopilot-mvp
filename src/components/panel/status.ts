import type { BookingStatus, SlotStatus } from "@shared/types";
import type { BadgeTone } from "@/components/ui/Badge";

export function bookingTone(status: BookingStatus): BadgeTone {
  if (status === "accepted") return "success";
  if (status === "pending") return "warning";
  if (status === "declined") return "danger";
  return "neutral";
}

export function slotTone(status: SlotStatus): BadgeTone {
  return status === "open" ? "success" : "neutral";
}
