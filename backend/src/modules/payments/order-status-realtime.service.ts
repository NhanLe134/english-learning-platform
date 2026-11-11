import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseClient } from '../../config/supabase.js'

export type OrderRealtimeStatus = 'subscribed' | 'unavailable'

/** Bridges one order's database UPDATE events to the authenticated API stream. */
export function subscribeToOrderStatus(
  orderId: string,
  onStatusChange: (status: string) => void,
  onConnectionChange: (status: OrderRealtimeStatus) => void,
  client: SupabaseClient = createSupabaseClient(),
): () => void {
  let lastStatus: string | undefined
  const channel = client
    .channel(`course-order-${orderId}-${randomUUID()}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'course_orders', filter: `id=eq.${orderId}` },
      (payload) => {
        const next = payload.new as { id?: unknown; status?: unknown }
        if (next.id === orderId && typeof next.status === 'string' && next.status !== lastStatus) {
          lastStatus = next.status
          onStatusChange(next.status)
        }
      },
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') onConnectionChange('subscribed')
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        onConnectionChange('unavailable')
      }
    })

  let closed = false
  return () => {
    if (closed) return
    closed = true
    void client.removeChannel(channel)
  }
}
