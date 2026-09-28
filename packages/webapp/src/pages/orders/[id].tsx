// Copyright 2024 Mastra Agent Stack
// SPDX-License-Identifier: MIT

import { useEffect, useState } from 'react'
import { NanoExplorer } from '../../lib/nano'

// ... existing imports ...

export default function OrderDetail({ orderId }: { orderId: string }) {
  const [blockInfo, setBlockInfo] = useState<any>(null)
  const nanoExplorer = new NanoExplorer(process.env.NEXT_PUBLIC_NANO_API_URL!)

  useEffect(() => {
    if (order.settle.rail === 'nano' && order.settle.nano?.blockHash) {
      nanoExplorer.getBlockInfo(order.settle.nano.blockHash).then(setBlockInfo)
    }
  }, [order.settle])

  // ... existing JSX ...

  return (
    <>
      {/* ... existing order details ... */}
      {order.settle.rail === 'nano' && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold">Nano Settlement</h3>
          <p>Block Hash: <code>{order.settle.nano.blockHash}</code></p>
          {blockInfo && (
            <div className="mt-2">
              <p>Destination: {blockInfo.account}</p>
              <p>Amount: {blockInfo.balance} raw XNO</p>
              <p>Confirmed: {new Date(order.settle.nano.confirmedAt!).toLocaleString()}</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
