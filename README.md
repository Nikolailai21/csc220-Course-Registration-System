# Course Registration System

A full-stack course registration portal for students, academic advisors, and administrators. Students can request courses and manage registration changes; advisors review requests and student records; administrators manage users and course offerings.

## Features

- Role-based sign-in for administrators, advisors, and students
- Admin tools for managing accounts, course offerings, schedules, and enrollment options
- Student course requests, registrations, schedule-conflict checks, and academic records
- Advisor tools for reviewing course and add/drop requests and viewing assigned students
- Telegram bot notifications for student add/drop and section-change requests
- PDF tuition invoices delivered to students through Discord direct messages

## Technology

- Frontend: React, Vite, Bootstrap
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Integrations: Telegram Bot API and Discord API

## Project layout

```text
client/                 React application
  src/pages/            Admin, advisor, login, and student screens
  src/components/       Shared UI components
server/                 Express API
  controllers/           Request handlers and integrations
  models/                Mongoose models
  routes/                API route definitions
  seed.js                Development/demo data seeder
  seedOfferingOptions.js Default section, room, and instructor choices
```

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB (local instance or a MongoDB connection string)

The frontend calls the API at `http://localhost:5001/api`, and the development server defaults to `http://localhost:5173`.

## Local setup

1. Start MongoDB locally, or obtain a MongoDB connection string.
2. Create `server/.env`:

   ```dotenv
   MONGO_URI=mongodb://127.0.0.1:27017/csc220_db
   PORT=5001
   JWT_SECRET=replace-with-a-long-random-development-secret
   TELEGRAM_BOT_TOKEN=
   DISCORD_BOT_TOKEN=
   ```

   `MONGO_URI` and `PORT` have development defaults in the server. Set a unique `JWT_SECRET`; the built-in fallback is for local development only. Telegram and Discord tokens are optional until those integrations are configured. Never commit `.env` or expose bot tokens in frontend code.

3. Install backend dependencies:

   ```bash
   cd server
   npm install
   ```

4. Install frontend dependencies in another terminal:

   ```bash
   cd client
   npm install
   ```

5. For a fresh local/demo database, seed sample users, courses, offerings, registrations, and records:

   ```bash
   cd server
   npm run seed
   npm run seed:offering-options
   ```

   **Warning:** `npm run seed` deletes existing users, courses, offerings, records, registrations, and course requests in the selected database before inserting sample data. Do not run it against production or any database whose data you need to preserve.

6. Start the API:

   ```bash
   cd server
   npm run dev
   ```

   The API health endpoint is `http://localhost:5001/api`.

7. Start the frontend in a separate terminal:

   ```bash
   cd client
   npm run dev
   ```

   Open the local URL printed by Vite (normally `http://localhost:5173`).

## Demo accounts

The seed script creates local development accounts. All seeded accounts use the password **`123`**.

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@system.com` | `123` |
| Advisor | `wendy@gmail.com` | `123` |
| Student | `ayla@gmail.com` | `123` |

Other advisor and student demo accounts are also created by `server/seed.js`. These credentials are public development fixtures; never reuse them in a deployed environment.

## Telegram setup

Telegram is used to notify a student's assigned advisor about add/drop or section-change requests.

1. Create a bot with Telegram's `@BotFather`.
2. Set the bot token as `TELEGRAM_BOT_TOKEN` in `server/.env`, then restart the API.
3. Have the advisor open the bot and press **Start**. The bot needs recent private-chat updates available through `getUpdates`; a configured webhook may prevent this polling-based chat lookup.
4. Sign in as an administrator, edit or create the advisor account, and use **Find Telegram chats** to link the advisor's private chat.
5. A student can submit a request from their registered course; the assigned advisor receives the request details through Telegram.

Keep the Telegram token on the server only.

## Discord invoice setup

Discord is used to deliver a generated tuition invoice PDF to a student by direct message.

1. Create a Discord application and bot, then configure `DISCORD_BOT_TOKEN` in `server/.env`.
2. Ensure the student can receive a direct message from the bot. Discord may require the student and bot to share a server, and the student's privacy settings must allow the DM.
3. Enable Developer Mode in Discord and copy the student's **user ID** (not a server, bot, or application ID).
4. Sign in as an administrator and link the ID to the student's account.
5. The student can select **Send invoice on Discord** in the dashboard.

The invoice generator currently uses the term configured in `server/controllers/invoiceController.js`. Keep the Discord token private and restart the API after changing server environment settings.

## Useful commands

Run commands from the relevant directory:

| Directory | Command | Purpose |
| --- | --- | --- |
| `server/` | `npm run dev` | Start the API with nodemon |
| `server/` | `npm start` | Start the API |
| `server/` | `npm run seed` | Replace local database contents with demo data |
| `server/` | `npm run seed:offering-options` | Add default section, room, and instructor options |
| `client/` | `npm run dev` | Start the Vite development server |
| `client/` | `npm run build` | Create a production frontend build |
| `client/` | `npm run lint` | Run Oxlint |

The server's current `npm test` script is a placeholder and does not run an automated test suite.

## Security and deployment notes

- Use unique, strong secrets and production-managed environment variables.
- Do not commit `.env`, database credentials, or Telegram/Discord bot tokens.
- Do not use the seeded demo accounts or fallback JWT secret in a deployed environment.
- Configure production CORS, HTTPS, database access controls, and bot privacy settings before deployment.
