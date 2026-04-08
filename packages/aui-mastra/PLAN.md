# @repo/aui-mastra — Plan

## Architecture

Thin, opinionated wrapper around the **AI SDK** + **assistant-ui** that
configures them for a Mastra server.  The AI SDK handles streaming, message
state, and tool-call rendering.  This package adds:

| Export             | Purpose                                             | Talks to                          |
| ------------------ | --------------------------------------------------- | --------------------------------- |
| `useMastraChat`    | Connects `useChat` + `useAISDKRuntime` to `chatRoute` | `/chat/:agentId` (AI SDK protocol) |
| `useMastraMemory`  | Thread CRUD, message history                        | `/api/memory/*`                    |

### Why the AI SDK, not a custom runtime?

Mastra's `chatRoute` (from `@mastra/ai-sdk`) speaks the AI SDK UI Message
Stream protocol natively.  The AI SDK handles tool-call state transitions
(`input-available` → `output-available`) as separate stream chunks with
`useSyncExternalStore`, creating natural render cycles.  This gives us
tool-call loading states for free — no custom deferral logic needed.

### Peer dependencies

The consumer installs the AI SDK + assistant-ui packages alongside this one:

```bash
pnpm add @repo/aui-mastra @ai-sdk/react @assistant-ui/react @assistant-ui/react-ai-sdk
```

### Usage

```tsx
import { useMastraChat } from "@repo/aui-mastra";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "./components/thread";

const runtime = useMastraChat({
  baseUrl: "http://localhost:4111",
  agentId: "weatherAgent",
});

<AssistantRuntimeProvider runtime={runtime}>
  <Thread />
</AssistantRuntimeProvider>
```

With memory (thread persistence):

```tsx
const runtime = useMastraChat({
  baseUrl: "http://localhost:4111",
  agentId: "weatherAgent",
  memory: { resourceId: "user-123", threadId: currentThreadId },
  headers: async () => ({ Authorization: `Bearer ${token}` }),
});
```

### Server requirements

The Mastra server must have `chatRoute` configured:

```typescript
import { chatRoute } from "@mastra/ai-sdk";

export const mastra = new Mastra({
  server: {
    apiRoutes: [
      chatRoute({ path: "/chat/:agentId" }),
    ],
  },
});
```

## Files

```
src/
  index.ts           — exports useMastraChat, useMastraMemory, types
  types.ts           — MastraChatConfig, MastraMemoryConfig, etc.
  useMastraChat.ts   — core hook (AI SDK transport → useChat → useAISDKRuntime)
  useMastraMemory.ts — thread CRUD via /api/memory/*
  health.ts          — server-only health monitoring (separate entry point)
```

## Roadmap

### Phase 1 — Core (COMPLETE)

- [x] `useMastraChat` — wraps AI SDK for Mastra `chatRoute`
- [x] `useMastraMemory` — thread CRUD via Mastra memory API
- [x] AI SDK + assistant-ui as peer dependencies
- [x] Tool-call loading states work out of the box
- [x] Removed all custom streaming code (accumulator, converter, etc.)

### Phase 2 — Workflow support via AI SDK

- [ ] `useMastraWorkflow` — wraps `useChat` pointed at `workflowRoute`
- [ ] Workflow step progress rendering (`data-workflow` parts)
- [ ] Workflow suspend/resume with user approval
- [ ] Agent text streaming from workflow steps

### Phase 3 — Thread list integration

- [ ] Thread list adapter for `unstable_useRemoteThreadListRuntime`
- [ ] `useMastraChatWithThreads` — full thread list + memory + chat
- [ ] History loading (convert Mastra messages → AI SDK format)
- [ ] Title generation (via summarizer agent)
- [ ] Thread-ID race condition handling (port from /chat)

### Phase 4 — Advanced features

- [ ] Agent network support via `networkRoute`
- [ ] Custom UI events (`data-*` parts)
- [ ] Attachment upload adapter
- [ ] Feedback adapter (thumbs up/down)
- [ ] Multi-agent routing (dynamic `agentId`)
