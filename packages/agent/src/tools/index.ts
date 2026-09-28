// Copyright 2024 Mastra Agent Stack
// SPDX-License-Identifier: MIT

import { NanoSettleTool } from './nano-settle'
import { NanoClient } from '../nano/client'

// ... existing tool exports ...

export const tools = {
  // ... existing tools ...
  'nano-settle': new NanoSettleTool(new NanoClient(process.env.NANO_API_URL!)),
}
