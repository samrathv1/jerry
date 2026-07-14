# Supabase Setup Guide

This document outlines how to set up the Supabase infrastructure to support Jerry's authentication and conversation persistence.

## 1. Create a Supabase Project

1. Go to [database.new](https://database.new) and create a new project.
2. Once provisioned, go to **Project Settings -> API** to get your credentials.

## 2. Configure Environment Variables

Create a `.env.local` file (do not commit this) from the `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Warning:** NEVER expose the `SUPABASE_SERVICE_ROLE_KEY` to the client. It bypasses all RLS policies.

## 3. Apply Database Migrations

In the Supabase dashboard, navigate to the **SQL Editor** and execute the contents of:

`supabase/migrations/00001_initial_schema.sql`

This sets up:
- The `profiles` table (linked to `auth.users`)
- The `conversations` and `messages` tables
- Row Level Security (RLS) policies for strict tenant isolation
- Database triggers for `updated_at` and profile auto-creation.

## 4. Authentication Settings

In the Supabase dashboard, go to **Authentication -> URL Configuration**:

1. Set the **Site URL** to your local development URL (e.g., `http://localhost:3000`).
2. Add additional **Redirect URLs** if you plan to deploy.
3. Under **Providers**, ensure "Email" is enabled. You may disable "Confirm email" for local development if desired.

## 5. Running the Application

Start the Next.js development server:

```bash
npm run dev
```

Visit `http://localhost:3000`. If you try to go to `/chat` without being logged in, you will be redirected to the `/login` page by the Next.js middleware.
