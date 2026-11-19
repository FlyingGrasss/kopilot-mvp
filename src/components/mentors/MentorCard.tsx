import Link from "next/link";
import type { MentorSummary } from "@shared/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import {
  displayName,
  examLabel,
  formatPrice,
  formatSlotDate,
  formatSlotTime,
} from "@/lib/format";

export interface MentorCardProps {
  mentor: MentorSummary;
}

export function MentorCard({ mentor }: MentorCardProps) {
  const name = displayName(mentor.username);

  return (
    <Link
      className="group flex h-full flex-col rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 transition-colors hover:border-[color:var(--border-strong)]"
      href={`/mentorlar/${mentor.id}`}
    >
      <div className="flex items-start gap-3">
        <Avatar color={mentor.avatarColor} name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-[color:var(--text)]">
              {name}
            </h3>
            <Badge>{examLabel(mentor.exam)}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-[color:var(--muted)]">{mentor.score}</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm font-medium leading-6 text-[color:var(--text)]">
        {mentor.headline}
      </p>

      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[color:var(--muted)]">
        <Icon name="graduation-cap" size={14} />
        <span className="truncate">
          {mentor.university} · {mentor.department}
        </span>
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {mentor.subjects.slice(0, 3).map((subject) => (
          <span
            className="rounded-md bg-[color:var(--elevated)] px-2 py-0.5 text-[11px] font-medium text-[color:var(--muted)]"
            key={subject}
          >
            {subject}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-[color:var(--border)] pt-4">
        <div>
          <p className="text-[11px] text-[color:var(--muted)]">Ders ücreti</p>
          <p className="text-sm font-semibold text-[color:var(--text)]">
            {formatPrice(mentor.priceTry)}
          </p>
        </div>
        <div className="text-right">
          {mentor.nextSlot ? (
            <>
              <p className="text-[11px] text-[color:var(--muted)]">En yakın saat</p>
              <p className="text-xs font-medium text-[color:var(--text)]">
                {formatSlotDate(mentor.nextSlot.startsAt)} ·{" "}
                {formatSlotTime(mentor.nextSlot.startsAt)}
              </p>
            </>
          ) : (
            <p className="text-xs text-[color:var(--muted)]">Şu an açık saat yok</p>
          )}
        </div>
      </div>
    </Link>
  );
}
