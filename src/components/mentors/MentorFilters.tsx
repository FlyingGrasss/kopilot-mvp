import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SUBJECT_SUGGESTIONS } from "@shared/constants";

export interface MentorFiltersProps {
  exam?: string;
  subject?: string;
  maxPrice?: string;
}

const examOptions = [
  { value: "", label: "Tüm sınavlar" },
  { value: "yks", label: "YKS" },
  { value: "lgs", label: "LGS" },
  { value: "ys", label: "YS" },
];

const priceOptions = [
  { value: "", label: "Tüm ücretler" },
  { value: "300", label: "300 TL'ye kadar" },
  { value: "400", label: "400 TL'ye kadar" },
  { value: "500", label: "500 TL'ye kadar" },
  { value: "600", label: "600 TL'ye kadar" },
  { value: "800", label: "800 TL'ye kadar" },
];

export function MentorFilters({ exam, subject, maxPrice }: MentorFiltersProps) {
  const hasFilters = Boolean(exam || subject || maxPrice);

  return (
    <form
      action="/mentorlar"
      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
      method="get"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[color:var(--text)]">Filtrele</h2>
        {hasFilters ? (
          <Link
            className="text-xs font-medium text-[color:var(--accent-text)] underline-offset-4 hover:underline"
            href="/mentorlar"
          >
            Temizle
          </Link>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <Select defaultValue={exam ?? ""} id="filter-exam" label="Sınav" name="exam">
          {examOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Input
          defaultValue={subject ?? ""}
          hint="Örn. Matematik, Fizik"
          id="filter-subject"
          label="Ders"
          list="subject-suggestions"
          name="subject"
          placeholder="Ders ara"
          type="search"
        />
        <datalist id="subject-suggestions">
          {SUBJECT_SUGGESTIONS.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        <Select
          defaultValue={maxPrice ?? ""}
          id="filter-price"
          label="En yüksek ücret"
          name="maxPrice"
        >
          {priceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Button className="w-full" type="submit">
          Filtrele
        </Button>
      </div>

      <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">
        Ücretler mentor tarafından belirlenir. Ödeme v1&apos;de alınmaz.
      </p>
    </form>
  );
}
