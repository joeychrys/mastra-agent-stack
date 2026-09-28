// Copyright 2024 Mastra Agent Stack
// SPDX-License-Identifier: MIT

import { expect } from 'chai'
import { NanoSettleTool } from '../src/tools/nano-settle'
import { NanoClient } from '../src/nano/client'
import { Order } from '../src/order/order.model'
import { ToolContext } from '@mastra/agent'

describe('NanoSettleTool', () => {
  let nanoClient: NanoClient
  let tool: NanoSettleTool
  let mockOrder: any

  beforeEach(() => {
    nanoClient = new NanoClient('https://nano.org')
    tool = new NanoSettleTool(nanoClient)
    mockOrder = {
      _id: 'test-order-id',
      settle: { rail: 'nano', nanoSourceAccount: 'test-source-account' },
      save: () => Promise.resolve()
    }
  })

  it('should settle a Nano payment', async () => {
    const ctx = {
      orderId: 'test-order-id',
      threadId: 'test-thread-id'
    } as ToolContext

    // Mock Nano client responses
    sinon.stub(nanoClient, 'sendPayment').resolves('test-block-hash')
    sinon.stub(nanoClient, 'validateBlock').resolves(true)
    sinon.stub(Order, 'findById').resolves(mockOrder)

    await tool.execute(ctx, {
      amount: 1000000000, // 1 XNO
      recipient: 'test-destination-account'
    })

    expect(mockOrder.settle.rail).to.equal('nano')
    expect(mockOrder.settle.blockHash).to.equal('test-block-hash')
    expect(mockOrder.settle.confirmedAt).to.be.instanceOf(Date)
  })

  it('should reject non-Nano orders', async () => {
    const ctx = {
      orderId: 'test-order-id',
      threadId: 'test-thread-id'
    } as ToolContext

    mockOrder.settle.rail = 'polar'
    sinon.stub(Order, 'findById').resolves(mockOrder)

    await expect(
      tool.execute(ctx, {
        amount: 1000000000,
        recipient: 'test-destination-account'
      })
    ).to.be.rejectedWith('Order not configured for Nano settlement')
  })
})
