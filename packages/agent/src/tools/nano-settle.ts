// Copyright 2024 Mastra Agent Stack
// SPDX-License-Identifier: MIT

import { Tool, ToolContext } from '@mastra/agent'
import { NanoClient } from '../nano/client'
import { Order } from '../order'
import { logger } from '../logger'

interface NanoSettleInput {
  amount: number // in raw XNO (1 XNO = 1e9 raw)
  recipient: string // Nano account address
  memo?: string // Optional memo for the payment
}

export class NanoSettleTool implements Tool<NanoSettleInput> {
  constructor(private nano: NanoClient) {}

  async execute(ctx: ToolContext, input: NanoSettleInput): Promise<void> {
    const { orderId, threadId } = ctx
    const order = await Order.findById(orderId)
    if (!order) throw new Error('Order not found')

    if (order.settle.rail !== 'nano') {
      throw new Error('Order not configured for Nano settlement')
    }

    try {
      const blockHash = await this.nano.sendPayment({
        source: order.settle.nanoSourceAccount,
        destination: input.recipient,
        amount: input.amount,
        memo: input.memo,
      })

      // Validate block confirmation
      const isConfirmed = await this.nano.validateBlock(blockHash)
      if (!isConfirmed) {
        throw new Error('Nano block not confirmed')
      }

      // Update order state
      order.settle.rail = 'nano'
      order.settle.blockHash = blockHash
      order.settle.confirmedAt = new Date()
      await order.save()

      logger.info(`Nano payment settled: ${blockHash} (${input.amount} XNO)`)
    } catch (err) {
      logger.error(`Nano settlement failed: ${err instanceof Error ? err.message : String(err)}`)
      throw err
    }
  }
}
