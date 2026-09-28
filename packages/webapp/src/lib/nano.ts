// Copyright 2024 Mastra Agent Stack
// SPDX-License-Identifier: MIT

import { nano } from 'nano'

export class NanoExplorer {
  private client: nano.Nano

  constructor(private apiUrl: string) {
    this.client = nano(apiUrl)
  }

  async getBlockInfo(blockHash: string): Promise<any> {
    return this.client.block(blockHash)
  }

  async getAccountInfo(account: string): Promise<any> {
    return this.client.account(account).info()
  }
}
