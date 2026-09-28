// Copyright 2024 Mastra Agent Stack
// SPDX-License-Identifier: MIT

import { Order } from './order.model'

export class OrderService {
  // ... existing methods ...

  async markNanoSettled(orderId: string, blockHash: string): Promise<Order> {
    return Order.findByIdAndUpdate(
      orderId,
      {
        'settle.nano.blockHash': blockHash,
        'settle.nano.confirmedAt': new Date(),
        'settle.rail': 'nano'
      },
      { new: true }
    )
  }

  async isNanoSettled(orderId: string): Promise<boolean> {
    const order = await Order.findById(orderId)
    return order?.settle.rail === 'nano' && !!order.settle.nano?.blockHash
  }
}
