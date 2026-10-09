# ConnectUp - Real-Time Messaging Web Application

A modern, responsive, full-stack messaging web application built with React, Tailwind CSS, and Supabase.

## Features
- Mobile number login with OTP verification
- Real-time 1-on-1 personal messaging
- Modern, responsive UI with Tailwind CSS
- User profiles and status messages
- Read receipts, typing indicators (extendable)

## Setup Instructions

### 1. Supabase Project Setup
1. Create a new project on [Supabase](https://supabase.com).
2. Go to **Authentication > Providers** and enable **Phone** authentication.
   - For local development, you can use the "Test phone numbers" section in the provider settings to mock OTPs without an SMS provider.
3. Go to **SQL Editor** in your Supabase dashboard.
4. Copy the contents of `supabase_schema.sql` and run it in the SQL Editor. This will create all necessary tables, types, and Row Level Security (RLS) policies.

### 2. Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in the values for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project settings (Project Settings > API).

### 3. Running the App
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## Next Steps / Future Enhancements
- Group chat functionality
- Image and file attachments (UI mostly in place, requires storage integration logic)
- Enhanced typing indicators via Supabase Presence
- Message edit/delete functionality (schema already supports it)
