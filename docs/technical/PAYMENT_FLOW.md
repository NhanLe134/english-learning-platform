# SePay Course Payments

## Checkout

The student selects a course and clicks the checkout button. The authenticated
frontend requests `POST /api/payment/orders`. The backend reads the published
course price, creates a `pending` row in `course_orders`, and creates signed
one-time SePay checkout fields with `sepay-pg-node`. The browser submits those
fields directly to SePay's hosted checkout.

`SEPAY_ENV=sandbox` selects SePay Sandbox. Set `SEPAY_ENV=production` with the
Production merchant credentials to use the Production checkout endpoint
`https://pay.sepay.vn/v1/checkout/init`. Merchant credentials remain on the
backend; signed checkout fields are returned to the browser as required by the
hosted form flow.

## Payment confirmation

SePay calls `POST ${API_ORIGIN}/api/payment/sepay-webhook`. Configure the
deployed, public HTTPS URL in the SePay Merchant Dashboard under Payment
Gateway → Configuration → IPN. Set the dashboard IPN auth type to `SECRET_KEY`
and configure the same value as `SEPAY_IPN_SECRET_KEY` on the backend. This is
the separate IPN secret, not `SEPAY_SECRET_KEY`.

The backend requires the `X-Secret-Key` header, validates the order UUID and
invoice reference, captured/approved payment state, transaction type, VND
currency, and exact order and transaction amounts. It changes only `pending`
orders to `paid`, then activates the matching student's course enrollment.
Repeated notifications are safe because order transitions are conditional
and course enrollment has a unique `(course_id, student_id)` constraint. The
success return page only displays the backend order status; it does not confirm
payment itself.

## Environment variables

Required in Production:

- `SEPAY_ENV=production`
- `SEPAY_MERCHANT_ID` — Production merchant ID
- `SEPAY_SECRET_KEY` — Production merchant secret key
- `SEPAY_IPN_SECRET_KEY` — secret configured for IPN authentication in the
  SePay Merchant Dashboard
- `API_ORIGIN` — public HTTPS origin of this backend
- `FRONTEND_URL` — public HTTPS origin of the frontend

For development, use Sandbox credentials and `SEPAY_ENV=sandbox`. Do not put
SePay secrets in frontend environment variables.
