# Payment Flow

The payment provider is not selected. Confirm whether to use SePay or PayOS
before implementing checkout or webhook handling.

The eventual flow must verify provider notifications on the server, validate
payment status, and prevent duplicate transaction processing. Never expose
payment secrets to the frontend.
