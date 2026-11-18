import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PaymentOrderRepository } from './payments.repository.js'

const orderRow = {
  id: 'e2c195be-c721-47eb-b323-99ab24e52d85',
  student_id: 'bae12d2f-0580-4669-8841-cc35cf671613',
  course_id: '2f0e53db-e138-4dd1-9314-b0045631cb36',
  amount: '50000.00',
  currency: 'VND',
  status: 'paid',
  transfer_content: 'DH-e2c195be',
  provider: 'sepay',
  provider_order_id: 'gateway-order-1',
  provider_transaction_id: 'gateway-transaction-1',
  paid_at: '2026-11-11T00:00:00.000Z',
  expired_at: null,
  created_at: '2026-11-10T00:00:00.000Z',
  updated_at: '2026-11-11T00:00:00.000Z',
}

describe('atomic verified payment repository', () => {
  it('calls the database transaction with verified references and returns only a paid order', async () => {
    let rpcName = ''
    let rpcArgs: Record<string, unknown> | undefined
    const client = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        rpcName = name
        rpcArgs = args
        return { data: { order: orderRow, isNewlyPaid: true }, error: null }
      },
    }
    const repository = new PaymentOrderRepository(() => client as never)

    const result = await repository.confirmVerifiedPayment(
      orderRow.id,
      'gateway-order-1',
      'gateway-transaction-1',
      50000,
    )

    assert.equal(rpcName, 'confirm_course_order_payment')
    assert.deepEqual(rpcArgs, {
      p_order_id: orderRow.id,
      p_provider_order_id: 'gateway-order-1',
      p_provider_transaction_id: 'gateway-transaction-1',
      p_amount: 50000,
    })
    assert.equal(result.order.status, 'paid')
    assert.equal(result.order.amount, 50000)
    assert.equal(result.isNewlyPaid, true)
  })

  it('propagates a database failure without returning a paid result', async () => {
    const client = {
      rpc: async () => ({ data: null, error: { code: '08006', message: 'database unavailable' } }),
    }
    const repository = new PaymentOrderRepository(() => client as never)

    await assert.rejects(
      repository.confirmVerifiedPayment(orderRow.id, 'gateway-order-1', 'gateway-transaction-1', 50000),
      /database unavailable/,
    )
  })

  it('rejects an RPC response whose order is not paid', async () => {
    const client = {
      rpc: async () => ({ data: { order: { ...orderRow, status: 'pending' }, isNewlyPaid: false }, error: null }),
    }
    const repository = new PaymentOrderRepository(() => client as never)

    await assert.rejects(
      repository.confirmVerifiedPayment(orderRow.id, 'gateway-order-1', 'gateway-transaction-1', 50000),
      /did not return a paid order/,
    )
  })
})
