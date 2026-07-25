"use client";

import { ArrowUpIcon } from "lucide-react";
import { useState } from "react";
import type { WorkflowInputRenderProps } from "../../components/workflow-runner";

// The workflow clamps `repeat` to this range server-side; mirror it here so the
// form can't submit a value the backend would silently rewrite.
const MIN_REPEAT = 1;
const MAX_REPEAT = 10;

export function DemoInput({ disabled, onSubmit }: WorkflowInputRenderProps) {
  const [text, setText] = useState("");
  const [repeat, setRepeat] = useState("3");
  const cleanText = text.trim();
  const repeatCount = Number(repeat);
  const canSubmit =
    !disabled &&
    cleanText !== "" &&
    Number.isInteger(repeatCount) &&
    repeatCount >= MIN_REPEAT &&
    repeatCount <= MAX_REPEAT;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({ text: cleanText, repeat: repeatCount }, cleanText);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Text</span>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder="Enter text to process..."
          className="w-full rounded-xl border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Repeat ({MIN_REPEAT}–{MAX_REPEAT})
        </span>
        <input
          type="number"
          min={MIN_REPEAT}
          max={MAX_REPEAT}
          value={repeat}
          onChange={(event) => setRepeat(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          className="w-full rounded-xl border px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
        />
      </label>
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
  );
}
