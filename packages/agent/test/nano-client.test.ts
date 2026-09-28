// Copyright 2024 Mastra Agent Stack
// SPDX-License-Identifier: MIT

import { expect } from 'chai'
import { NanoClient } from '../src/nano/client'
import * as nanoLib from 'nano'

describe('NanoClient', () => {
  let nanoClient: NanoClient

  beforeEach(() => {
    nanoClient = new NanoClient('https://nano.org')
  })

  it('should send a Nano payment', async () => {
    const stub = sinon.stub(nanoLib, 'nano').returns({
      account: () => ({
        blocks: () => [{
          account: 'source-account',
          previous: 'prev-block',
          representative: 'rep-account',
          balance: '1000000000000000000000000000000',
          link: 'prev-block',
          link_as_account: 'prev-account',
          signature: 'sig',
          work: 'work'
        }],
        signBlock: (block: any) => Promise.resolve(block),
        blocks: { put: (block: any) => Promise.resolve('test-block-hash') }
      })
    })

    const result = await nanoClient.sendPayment({
      source: 'source-account',
      destination: 'dest-account',
      amount: 1000000000,
      memo: 'test-memo'
    })

    expect(result).to.equal('test-block-hash')
    stub.restore()
  })

  it('should validate a Nano block', async () => {
    const stub = sinon.stub(nanoLib, 'nano').returns({
      block: () => Promise.resolve({
        account: 'dest-account',
        previous: 'prev-block',
        representative: 'rep-account',
        balance: '999000000000000000000000000000',
        link: 'prev-block',
        link_as_account: 'prev-account',
        signature: 'sig',
        work: 'work'
      }),
      account: () => ({
        info: () => Promise.resolve({
          block_count: 1
        })
      })
    })

    const result = await nanoClient.validateBlock('test-block-hash')
    expect(result).to.be.true
    stub.restore()
  })
})
