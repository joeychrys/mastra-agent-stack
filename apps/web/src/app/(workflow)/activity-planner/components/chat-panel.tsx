"use client";

import type { useMastraWorkflow } from "@repo/aui-mastra";
import { ArrowUpIcon } from "lucide-react";
import { useRef } from "react";
import { SUGGESTIONS } from "../lib/constants";
import type { CityOption } from "./city-select";
import { CitySelect } from "./city-select";

export function ChatPanel({
  messages,
  input,
  setInput,
  isReady,
  isEmpty,
  suspendedStep,
  onSubmit,
  onResume,
}: {
  messages: ReturnType<typeof useMastraWorkflow>["messages"];
  input: string;
  setInput: (v: string) => void;
  isReady: boolean;
  isEmpty: boolean;
  suspendedStep: ReturnType<typeof useMastraWorkflow>["suspendedStep"];
  onSubmit: (city: string) => void;
  onResume: (city: CityOption) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pt-4">
        {isEmpty && (
          <div className="flex h-full flex-col px-2">
            <div className="my-auto">
              <h1 className="text-2xl font-medium tracking-tight">Weather Activity Planner</h1>
              <p className="text-muted-foreground text-xl">
                Enter a city to get a forecast and activity suggestions.
              </p>
            </div>
            <div className="mt-auto grid w-full gap-2 pb-4 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.city}
                  type="button"
                  disabled={!isReady}
                  className="hover:bg-muted h-auto w-full cursor-pointer rounded-2xl border px-4 py-3 text-left text-sm transition-colors disabled:opacity-50"
                  onClick={() => onSubmit(s.city)}
                >
                  <span className="font-medium">{s.city}</span>
                  <span className="text-muted-foreground ml-1">{s.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="py-2">
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div className="bg-muted text-foreground rounded-2xl px-4 py-2.5 text-sm">
                  {msg.parts
                    .filter((p): p is { type: "text"; text: string } => p.type === "text")
                    .map((p) => p.text)
                    .join("")}
                </div>
              </div>
            )}

            {msg.role === "assistant" && (
              <div className="text-foreground text-sm leading-relaxed">
                {msg.parts
                  .filter((p): p is { type: "text"; text: string } => p.type === "text")
                  .map((p, i) => (
                    <p key={i}>{p.text}</p>
                  ))}
              </div>
            )}
          </div>
        ))}

        {suspendedStep && (
          <CitySelect options={suspendedStep.payload.options as CityOption[]} onSelect={onResume} />
        )}
      </div>

      <div className="bg-background sticky bottom-0 px-4 pb-4 md:pb-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || !isReady) return;
            onSubmit(input.trim());
          }}
          className="border-input bg-background focus-within:border-ring focus-within:ring-ring/20 flex w-full flex-col rounded-2xl border px-1 pt-2 transition-shadow outline-none focus-within:ring-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && isReady) {
                  onSubmit(input.trim());
                }
              }
            }}
            placeholder="Enter a city name..."
            className="placeholder:text-muted-foreground mb-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none focus-visible:ring-0"
            rows={1}
          />
          <div className="relative mx-2 mb-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={!input.trim() || !isReady}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
            >
              <ArrowUpIcon className="size-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
