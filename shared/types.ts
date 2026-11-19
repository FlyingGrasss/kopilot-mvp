/** Wire contracts shared by the Next app and the Express API. */

export type Role = "student" | "mentor";
export type Exam = "ys" | "yks" | "lgs";
export type SlotStatus = "open" | "booked";
export type BookingStatus = "pending" | "accepted" | "declined" | "cancelled";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "USERNAME_TAKEN"
  | "RATE_LIMITED"
  | "CSRF_REJECTED"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "INVALID_JSON"
  | "SLOT_UNAVAILABLE"
  | "SLOT_EXISTS"
  | "SLOT_BOOKED"
  | "BOOKING_EXISTS"
  | "INVALID_STATE"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    field?: string;
    retryAfterMs?: number;
  };
}

export interface UserDto {
  id: string;
  username: string;
  role: Role;
  createdAt: number;
}

export interface AuthResponse {
  user: UserDto;
}

export interface SlotDto {
  id: string;
  mentorId: string;
  startsAt: number;
  durationMin: number;
  status: SlotStatus;
}

export interface MentorSlotDto extends SlotDto {
  pendingCount: number;
}

export interface NextSlotDto {
  id: string;
  startsAt: number;
  durationMin: number;
}

export interface MentorProfileFields {
  headline: string;
  university: string;
  department: string;
  exam: Exam;
  score: string;
  subjects: string[];
  priceTry: number;
  bio: string;
  avatarColor: string;
}

export interface MentorSummary extends MentorProfileFields {
  id: string;
  username: string;
  nextSlot: NextSlotDto | null;
}

export interface MentorDetail extends MentorSummary {
  openSlots: SlotDto[];
}

export interface BookingParty {
  id: string;
  username: string;
  avatarColor: string | null;
  headline: string | null;
  priceTry: number | null;
}

export interface BookingDto {
  id: string;
  status: BookingStatus;
  message: string;
  createdAt: number;
  updatedAt: number;
  slot: SlotDto;
  student: BookingParty;
  mentor: BookingParty;
}

export interface MentorListResponse {
  mentors: MentorSummary[];
}

export interface MentorDetailResponse {
  mentor: MentorDetail;
}

export interface BookingResponse {
  booking: BookingDto;
}

export interface BookingListResponse {
  bookings: BookingDto[];
}

export interface MentorSlotListResponse {
  slots: MentorSlotDto[];
}
