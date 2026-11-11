import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { subscribeToOrderStatus } from './order-status-realtime.service.js'

describe('order status Realtime bridge', () => {
  it('filters to one order, emits each status once, reports reconnects, and cleans up', () => {
    const orderId = '24c82a3e-7316-4f4f-a0d9-f044e0be23f9'
    let payloadHandler: ((payload: { new: { id: string; status: string } }) => void) | undefined
    let connectionHandler: ((status: string) => void) | undefined
    let subscribedConfig: unknown
    let removed = false
    const channel = {
      on: (_event: string, config: unknown, handler: typeof payloadHandler) => {
        subscribedConfig = config
        payloadHandler = handler
        return channel
      },
      subscribe: (handler: typeof connectionHandler) => {
        connectionHandler = handler
        return channel
      },
    }
    const client = {
      channel: () => channel,
      removeChannel: async () => { removed = true },
    } as unknown as SupabaseClient
    const statuses: string[] = []
    const connections: string[] = []
    const unsubscribe = subscribeToOrderStatus(
      orderId,
      (status) => statuses.push(status),
      (status) => connections.push(status),
      client,
    )

    assert.deepEqual(subscribedConfig, {
      event: 'UPDATE', schema: 'public', table: 'course_orders', filter: `id=eq.${orderId}`,
    })
    connectionHandler?.('SUBSCRIBED')
    connectionHandler?.('CHANNEL_ERROR')
    payloadHandler?.({ new: { id: 'different-order', status: 'paid' } })
    payloadHandler?.({ new: { id: orderId, status: 'paid' } })
    payloadHandler?.({ new: { id: orderId, status: 'paid' } })
    payloadHandler?.({ new: { id: orderId, status: 'expired' } })
    unsubscribe()
    unsubscribe()

    assert.deepEqual(statuses, ['paid', 'expired'])
    assert.deepEqual(connections, ['subscribed', 'unavailable'])
    assert.equal(removed, true)
  })
})
