"use client";

export type CityOption = {
  city: string;
  region?: string;
  country: string;
};

export function CitySelect({
  options,
  onSelect,
}: {
  options: CityOption[];
  onSelect: (city: CityOption) => void;
}) {
  return (
    <div className="mt-3 rounded-2xl border px-4 py-4">
      <p className="mb-3 text-sm font-medium">Which one did you mean?</p>

      <div className="grid gap-2 @md:grid-cols-2">
        {options.map((city) => (
          <button
            key={`${city.city}-${city.region ?? ""}-${city.country}`}
            type="button"
            className="hover:border-foreground/20 hover:bg-muted cursor-pointer rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors"
            onClick={() => onSelect(city)}
          >
            {[city.city, city.region, city.country].filter(Boolean).join(", ")}
          </button>
        ))}
      </div>
    </div>
  );
}
