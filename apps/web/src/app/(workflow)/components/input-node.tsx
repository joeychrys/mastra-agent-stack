"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { ArrowUpIcon, History, PenLine } from "lucide-react";
import { useState } from "react";
import { formatStepName } from "../lib/step-status";
import type { WorkflowInputField } from "../lib/use-workflow-definition";
import { HANDLE_CLASS } from "./step-node";

export type InputNodeData = {
  /** Disable the input while a run is in flight. */
  disabled: boolean;
  /** Node heading (workflow display name or first field label). */
  label: string;
  /** Short description shown under the label. */
  description?: string;
  /** Fields parsed from the workflow's input schema. */
  fields: WorkflowInputField[];
  /**
   * When viewing a historical run, the original input is shown read-only
   * instead of the form.
   */
  staticValue?: string;
  onSubmit: (values: Record<string, unknown>, label: string) => void;
};

// NOTE: the type name must not be "input" — that's a React Flow built-in node
// type whose default styles (white card chrome) would render behind the
// custom component.
export type InputNodeType = Node<InputNodeData, "workflowInput">;

/** Coerce a text value to the field's JSON-schema type. */
function coerceValue(field: WorkflowInputField, raw: string): unknown {
  if (field.type === "number" || field.type === "integer") {
    const num = Number(raw);
    return Number.isNaN(num) ? raw : num;
  }
  if (field.type === "boolean") return raw === "true";
  return raw;
}

export function InputNode({ data }: NodeProps<InputNodeType>) {
  const { disabled, label, description, fields, staticValue, onSubmit } = data;
  const [values, setValues] = useState<Record<string, string>>({});

  const setField = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const canSubmit =
    !disabled &&
    fields.length > 0 &&
    fields.every((f) => !f.required || (values[f.name] ?? "").trim() !== "");

  const submit = () => {
    if (!canSubmit) return;
    const inputData: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = (values[field.name] ?? "").trim();
      if (raw === "") continue;
      inputData[field.name] = coerceValue(field, raw);
    }
    const textLabel =
      fields
        .map((f) => (values[f.name] ?? "").trim())
        .filter(Boolean)
        .join(", ") || "Run";
    onSubmit(inputData, textLabel);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const single = fields.length === 1;

  return (
    <div className="pointer-events-auto w-[300px] rounded-2xl border bg-background shadow-sm">
      <div className="px-3 pt-2.5">
        <div className="flex items-center gap-2">
          <PenLine className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {description && (
          <p className="mt-1 text-xs leading-snug text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="px-3 pb-3 pt-2">
        {staticValue !== undefined ? (
          <div className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2">
            <History className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm">{staticValue}</span>
          </div>
        ) : single ? (
          /* nodrag/nopan keep React Flow from hijacking pointer + space keys. */
          <div className="nodrag nopan flex items-center gap-1.5 rounded-xl border px-1.5 py-1 focus-within:ring-2 focus-within:ring-ring/20">
            <input
              value={values[fields[0].name] ?? ""}
              onChange={(e) => setField(fields[0].name, e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Enter a ${formatStepName(fields[0].name).toLowerCase()}...`}
              disabled={disabled}
              className="min-w-0 flex-1 bg-transparent px-2 py-1 text-sm outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30"
            >
              <ArrowUpIcon className="size-3.5" />
            </button>
          </div>
        ) : (
          <div className="nodrag nopan space-y-2">
            {fields.map((field) => (
              <label key={field.name} className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  {formatStepName(field.name)}
                  {field.required && <span className="text-destructive"> *</span>}
                </span>
                <input
                  value={values[field.name] ?? ""}
                  onChange={(e) => setField(field.name, e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={field.description ?? ""}
                  disabled={disabled}
                  className="w-full rounded-xl border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
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
              Run
            </button>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className={HANDLE_CLASS} />
    </div>
  );
}
