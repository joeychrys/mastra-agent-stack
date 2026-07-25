"use client";

import { ArrowUpIcon } from "lucide-react";
import { useState } from "react";
import type { WorkflowInputField } from "../hooks/use-workflow-definition";
import { formatStepName } from "../lib/step-status";

// ---------------------------------------------------------------------------
// SuspendForm — generic UI for a suspended workflow step.
//
// Rendering strategy, in order of preference:
// 1. `payload.options` is a non-empty array  → one button per option (the
//    common "pick one" suspend pattern, e.g. city disambiguation).
// 2. The step has parsed `resumeFields`      → a small form, one input per
//    top-level field of the step's `resumeSchema`.
// 3. Fallback                                → a free-text input sent as
//    `{ value }` (or parsed JSON if the text is a JSON object).
// ---------------------------------------------------------------------------

export type SuspendFormProps = {
  /** The step's suspend payload (may include `message` and `options`). */
  payload: Record<string, unknown>;
  /** Top-level fields of the step's `resumeSchema` (from the definition). */
  resumeFields?: WorkflowInputField[];
  /** Send the resume payload; `label` is the visible user message. */
  onResume: (data: Record<string, unknown>, label: string) => void;
};

/** Human label for an option: primitives verbatim, objects by their values. */
function optionLabel(option: unknown): string {
  if (option == null) return "";
  if (typeof option !== "object") return String(option);
  return Object.values(option as Record<string, unknown>)
    .filter((v): v is string | number => typeof v === "string" || typeof v === "number")
    .map(String)
    .filter((v) => v.trim() !== "")
    .join(", ");
}

/** Build the resume payload for a selected option. */
function optionData(option: unknown, resumeFields: WorkflowInputField[]): Record<string, unknown> {
  if (option != null && typeof option === "object") {
    const record = option as Record<string, unknown>;
    // Constrain to the resume schema's fields when known, so extra display
    // keys on the option don't leak into the resume payload.
    if (resumeFields.length > 0) {
      const allowed = new Set(resumeFields.map((f) => f.name));
      return Object.fromEntries(Object.entries(record).filter(([key]) => allowed.has(key)));
    }
    return record;
  }
  // Primitive option: map onto a single-field resume schema when possible.
  if (resumeFields.length === 1) return { [resumeFields[0].name]: option };
  return { value: option };
}

/** Coerce a text value to the field's JSON-schema type. */
function coerceValue(field: WorkflowInputField, raw: string): unknown {
  if (field.type === "number" || field.type === "integer") {
    const num = Number(raw);
    return Number.isNaN(num) ? raw : num;
  }
  if (field.type === "boolean") return raw === "true";
  return raw;
}

export function SuspendForm({ payload, resumeFields = [], onResume }: SuspendFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState("");

  const message =
    typeof payload.message === "string" && payload.message.trim() !== ""
      ? payload.message
      : "This step needs your input to continue.";

  const options = Array.isArray(payload.options) ? payload.options : [];

  // 1. Option picker ---------------------------------------------------------
  if (options.length > 0) {
    return (
      <div className="mt-3 rounded-2xl border px-4 py-4">
        <p className="mb-3 text-sm font-medium">{message}</p>
        <div className="grid gap-2 @md:grid-cols-2">
          {options.map((option, i) => {
            const label = optionLabel(option) || `Option ${i + 1}`;
            return (
              <button
                key={label}
                type="button"
                className="hover:border-foreground/20 hover:bg-muted cursor-pointer rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors"
                onClick={() => onResume(optionData(option, resumeFields), label)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Schema-driven form ----------------------------------------------------
  if (resumeFields.length > 0) {
    const canSubmit = resumeFields.every(
      (f) => !f.required || (values[f.name] ?? "").trim() !== "",
    );

    const submit = () => {
      if (!canSubmit) return;
      const data: Record<string, unknown> = {};
      for (const field of resumeFields) {
        const raw = (values[field.name] ?? "").trim();
        if (raw === "") continue;
        data[field.name] = coerceValue(field, raw);
      }
      const label =
        resumeFields
          .map((f) => (values[f.name] ?? "").trim())
          .filter(Boolean)
          .join(", ") || "Continue";
      onResume(data, label);
    };

    return (
      <div className="mt-3 rounded-2xl border px-4 py-4">
        <p className="mb-3 text-sm font-medium">{message}</p>
        <div className="space-y-2">
          {resumeFields.map((field) => (
            <label key={field.name} className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                {formatStepName(field.name)}
                {field.required && <span className="text-destructive"> *</span>}
              </span>
              <input
                value={values[field.name] ?? ""}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={field.description ?? ""}
                className="w-full rounded-xl border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20"
              />
            </label>
          ))}
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-1.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30"
          >
            <ArrowUpIcon className="size-3.5" />
            Continue
          </button>
        </div>
      </div>
    );
  }

  // 3. Free-text fallback ------------------------------------------------------
  const submitFreeText = () => {
    const trimmed = freeText.trim();
    if (trimmed === "") return;
    let data: Record<string, unknown> = { value: trimmed };
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
        data = parsed as Record<string, unknown>;
      }
    } catch {
      // Not JSON — send as { value }.
    }
    onResume(data, trimmed);
  };

  return (
    <div className="mt-3 rounded-2xl border px-4 py-4">
      <p className="mb-3 text-sm font-medium">{message}</p>
      <div className="flex items-center gap-1.5 rounded-xl border px-1.5 py-1 focus-within:ring-2 focus-within:ring-ring/20">
        <input
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitFreeText();
            }
          }}
          placeholder="Your response..."
          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm outline-none"
        />
        <button
          type="button"
          onClick={submitFreeText}
          disabled={!freeText.trim()}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30"
        >
          <ArrowUpIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
