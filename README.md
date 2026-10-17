# english-learning-platform
Nền tảng học tiếng Anh trực tuyến tích hợp luyện Speaking, Listening, Flashcard, quản lý Workshop Zoom và thanh toán tự động VietQR.

## Development

The application is split into a React + TypeScript + Vite frontend and a
Node.js + Express + TypeScript backend.

1. Copy `frontend/.env.example` to `frontend/.env` and set the frontend values
   you use.
2. Copy `backend/.env.example` to `backend/.env` and set the backend values
   you use. Do not put backend secrets in the frontend environment.
3. In separate terminals, run `npm install` and `npm run dev` from both
   `frontend/` and `backend/`.

The frontend runs on Vite's default port (5173); the API listens on port 5000
by default and exposes `GET /api/health`. See `docs/` and the project
structure document for the planned modules. Business integrations and
authentication are not yet implemented.
