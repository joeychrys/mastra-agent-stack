// Copyright 2024 Mastra Agent Stack
// SPDX-License-Identifier: MIT

import { nano } from 'nano'
import { logger } from '../logger'

interface NanoPayment {
  source: string
  destination: string
  amount: number // raw XNO
  memo?: string
}

interface NanoBlock {
  account: string
  previous: string
  representative: string
  balance: string
  link: string
  link_as_account: string
  signature: string
  work: string
}

export class NanoClient {
  private client: nano.Nano

  constructor(private apiUrl: string) {
    this.client = nano(apiUrl)
  }

  async sendPayment(payment: NanoPayment): Promise<string> {
    const account = this.client.account(payment.source)
    const block = await account.blocks()
    const latestBlock = block[block.length - 1]

    const newBlock = {
      ...latestBlock,
      account: payment.destination,
      balance: (BigInt(latestBlock.balance) - BigInt(payment.amount)).toString(),
      link: payment.destination,
      link_as_account: payment.destination,
      memo: payment.memo || '',
    }

    const signedBlock = await account.signBlock(newBlock)
    const blockHash = await account.blocks.put(signedBlock)
    return blockHash
  }

  async validateBlock(blockHash: string): Promise<boolean> {
    try {
      const block = await this.client.block(blockHash)
      const accountInfo = await this.client.account(block.account).info()
      return accountInfo.block_count > 0
    } catch (err) {
      logger.error(`Nano block validation failed: ${err instanceof Error ? err.message : String(err)}`)
      return false
    }
  }
}
