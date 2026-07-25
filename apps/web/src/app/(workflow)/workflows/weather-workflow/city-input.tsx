"use client";

import { ArrowUpIcon } from "lucide-react";
import { useState } from "react";
import type { WorkflowInputRenderProps } from "../../components/workflow-runner";

export function CityInput({ disabled, onSubmit }: WorkflowInputRenderProps) {
  const [city, setCity] = useState("");
  const value = city.trim();

  const submit = () => {
    if (disabled || !value) return;
    onSubmit({ city: value }, value);
  };

  return (
    <div className="flex items-center gap-1.5 rounded-xl border px-1.5 py-1 focus-within:ring-2 focus-within:ring-ring/20">
      <input
        value={city}
        onChange={(event) => setCity(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Enter a city..."
        disabled={disabled}
        className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm outline-none disabled:opacity-50"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value}
        aria-label="Run activity planner"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30"
      >
        <ArrowUpIcon className="size-3.5" />
      </button>
    </div>
  );
}
