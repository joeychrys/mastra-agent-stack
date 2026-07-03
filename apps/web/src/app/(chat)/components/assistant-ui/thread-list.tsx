import {
  AssistantIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
} from "@assistant-ui/react";
import { MoreHorizontalIcon, PlusIcon, Trash2Icon } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const ThreadList: FC = () => {
  return (
    <ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex flex-col">
      <ThreadListNew />
      <div className="mt-4 flex flex-col">
        <span className="text-muted-foreground mb-1 px-3 text-xs font-medium">Recents</span>
        <div className="flex flex-col gap-0.5">
          <AssistantIf condition={({ threads }) => threads.isLoading}>
            <ThreadListSkeleton />
          </AssistantIf>
          <AssistantIf condition={({ threads }) => !threads.isLoading}>
            <ThreadListPrimitive.Items components={{ ThreadListItem }} />
          </AssistantIf>
        </div>
      </div>
    </ThreadListPrimitive.Root>
  );
};

const ThreadListNew: FC = () => {
  return (
    <ThreadListPrimitive.New asChild>
      <button
        type="button"
        className="hover:bg-muted data-active:bg-muted flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
      >
        <PlusIcon className="size-4" />
        New chat
      </button>
    </ThreadListPrimitive.New>
  );
};

const ThreadListSkeleton: FC = () => {
  return (
    <div className="flex flex-col gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton with fixed length, never reordered
          key={i}
          role="status"
          aria-label="Loading threads"
          className="aui-thread-list-skeleton-wrapper flex h-8 items-center px-3"
        >
          <Skeleton className="aui-thread-list-skeleton h-3.5 w-full" />
        </div>
      ))}
    </div>
  );
};

const ThreadListItem: FC = () => {
  return (
    <ThreadListItemPrimitive.Root className="aui-thread-list-item group hover:bg-muted/50 data-active:bg-muted relative flex items-center rounded-lg transition-colors">
      <ThreadListItemPrimitive.Trigger className="aui-thread-list-item-trigger flex h-full min-w-0 flex-1 items-center truncate px-3 py-2 text-start text-sm">
        <span className="truncate">
          <ThreadListItemPrimitive.Title fallback="New Chat" />
        </span>
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemMore />
    </ThreadListItemPrimitive.Root>
  );
};

const ThreadListItemMore: FC = () => {
  return (
    <ThreadListItemMorePrimitive.Root>
      <ThreadListItemMorePrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="aui-thread-list-item-more mr-1 size-6 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100 group-data-active:opacity-100 data-[state=open]:opacity-100"
        >
          <MoreHorizontalIcon className="size-3.5" />
          <span className="sr-only">More options</span>
        </Button>
      </ThreadListItemMorePrimitive.Trigger>
      <ThreadListItemMorePrimitive.Content
        side="bottom"
        align="start"
        className="aui-thread-list-item-more-content bg-popover text-popover-foreground z-50 min-w-36 overflow-hidden rounded-lg border p-1 shadow-md"
      >
        <ThreadListItemPrimitive.Archive asChild>
          <ThreadListItemMorePrimitive.Item className="aui-thread-list-item-more-item hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none">
            <Trash2Icon className="size-4" />
            Delete
          </ThreadListItemMorePrimitive.Item>
        </ThreadListItemPrimitive.Archive>
      </ThreadListItemMorePrimitive.Content>
    </ThreadListItemMorePrimitive.Root>
  );
};
