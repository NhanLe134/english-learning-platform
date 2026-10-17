# Deployment

Deployment configuration is not yet defined. Set environment variables from
the relevant `.env.example` files in the deployment platform's secret manager;
do not deploy local `.env` files or commit credentials.

Build the frontend and backend with `npm run build` from their respective
directories. Configure the production frontend origin in the backend's
`FRONTEND_URL` setting.
