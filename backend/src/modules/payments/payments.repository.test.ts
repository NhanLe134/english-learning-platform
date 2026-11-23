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
  it('creates or reuses pending orders through the serialized database operation', async () => {
    let rpcName = ''
    let rpcArgs: Record<string, unknown> | undefined
    const client = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        rpcName = name
        rpcArgs = args
        return { data: { order: { ...orderRow, status: 'pending' } }, error: null }
      },
    }
    const repository = new PaymentOrderRepository(() => client as never)
    const pending = await repository.createOrReusePendingOrder({
      id: orderRow.id,
      studentId: orderRow.student_id,
      courseId: orderRow.course_id,
      amount: 50000,
      transferContent: 'DH-e2c195be',
      expiredAt: '2026-11-20T00:15:00.000Z',
    })
    assert.equal(pending.status, 'pending')
    assert.equal(rpcName, 'create_or_reuse_pending_course_order')
    assert.deepEqual(rpcArgs, {
      p_order_id: orderRow.id,
      p_student_id: orderRow.student_id,
      p_course_id: orderRow.course_id,
      p_amount: 50000,
      p_transfer_content: 'DH-e2c195be',
      p_expired_at: '2026-11-20T00:15:00.000Z',
    })
  })

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

  it('queries orders by provider_order_id, transfer_content, and provider_transaction_id with limit(2)', async () => {
    const queries: Array<{ column: string; value: string; limit: number }> = []
    const makeClient = () => ({
      from: (table: string) => {
        assert.equal(table, 'course_orders')
        let column = ''
        let value = ''
        const builder = {
          select: () => builder,
          eq: (col: string, val: string) => {
            column = col
            value = val
            return builder
          },
          order: () => builder,
          limit: async (n: number) => {
            queries.push({ column, value, limit: n })
            return { data: [orderRow], error: null }
          },
        }
        return builder
      },
    })

    const repository = new PaymentOrderRepository(() => makeClient() as never)
    const byProviderOrder = await repository.findOrdersByProviderOrderId('gateway-order-1')
    const byTransferContent = await repository.findOrdersByTransferContent('DH-e2c195be')
    const byProviderTx = await repository.findOrdersByProviderTransactionId('gateway-transaction-1')

    assert.equal(byProviderOrder[0]?.id, orderRow.id)
    assert.equal(byProviderOrder[0]?.amount, 50000)
    assert.equal(byTransferContent[0]?.id, orderRow.id)
    assert.equal(byProviderTx[0]?.id, orderRow.id)
    assert.deepEqual(queries, [
      { column: 'provider_order_id', value: 'gateway-order-1', limit: 2 },
      { column: 'transfer_content', value: 'DH-e2c195be', limit: 2 },
      { column: 'provider_transaction_id', value: 'gateway-transaction-1', limit: 2 },
    ])
  })
})
