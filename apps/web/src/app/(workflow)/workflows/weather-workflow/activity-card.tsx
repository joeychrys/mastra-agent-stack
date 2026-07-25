"use client";

type ActivityItem = {
  name: string;
  description: string;
  timing?: string;
  note?: string;
};

type ActivitiesPlan = {
  morning: ActivityItem[];
  afternoon: ActivityItem[];
  indoor: ActivityItem[];
  considerations: string[];
};

function ActivityItemRow({ item }: { item: ActivityItem }) {
  return (
    <div className="py-1.5">
      <p className="text-sm font-medium">{item.name}</p>
      {item.description && (
        <p className="text-muted-foreground mt-0.5 text-xs">{item.description}</p>
      )}
      {(item.timing || item.note) && (
        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 text-xs">
          {item.timing && <span>{item.timing}</span>}
          {item.note && <span className="italic">{item.note}</span>}
        </div>
      )}
    </div>
  );
}

function ActivitySection({
  items,
  title,
  accent = "text-muted-foreground",
}: {
  items: ActivityItem[];
  title: string;
  accent?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`mb-1 text-xs font-medium uppercase tracking-wider ${accent}`}>{title}</p>
      <div className="divide-y divide-border/50">
        {items.map((item) => (
          <ActivityItemRow key={item.name} item={item} />
        ))}
      </div>
    </div>
  );
}

export function ActivityCard({ output }: { output: unknown }) {
  const plan = output as ActivitiesPlan;

  if (!plan?.morning && !plan?.afternoon && !plan?.indoor) {
    return (
      <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-muted px-4 py-3 text-xs">
        {JSON.stringify(output, null, 2)}
      </pre>
    );
  }

  return (
    <div className="mt-2 rounded-2xl border">
      <div className="space-y-4 px-4 py-3">
        <ActivitySection items={plan.morning} title="Morning" accent="text-amber-500" />
        <ActivitySection items={plan.afternoon} title="Afternoon" accent="text-orange-500" />
        <ActivitySection items={plan.indoor} title="Indoor" accent="text-violet-500" />
      </div>

      {plan.considerations?.length > 0 && (
        <div className="border-t px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
          {plan.considerations.map((c) => (
            <p key={c}>{c}</p>
          ))}
        </div>
      )}
    </div>
  );
}
