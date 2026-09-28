// Copyright 2024 Mastra Agent Stack
// SPDX-License-Identifier: MIT

import { Schema, model } from 'mongoose'

interface SettleNano {
  rail: 'nano'
  nanoSourceAccount: string
  blockHash?: string
  confirmedAt?: Date
}

interface SettlePolar {
  rail: 'polar'
  transactionId?: string
  confirmedAt?: Date
}

interface Settle {
  rail: 'nano' | 'polar'
  nano?: SettleNano
  polar?: SettlePolar
}

const orderSchema = new Schema({
  // ... existing fields ...
  settle: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: (settle: Settle) => {
        return settle.rail === 'nano' || settle.rail === 'polar'
      },
      message: 'Invalid settlement rail'
    }
  }
}, { timestamps: true })

export const Order = model('Order', orderSchema)
