# Google Integration Setup

This document explains how to set up the Google Workspace integration for Jerry.

## Current Limitations
- **Supabase Vault Security**: Real OAuth tokens are currently NOT stored because secure Vault storage has not been verified. Do not store real tokens in plaintext or client storage.
- **Gmail**: The adapter (`src/lib/providers/gmail.ts`) ONLY supports draft creation. It does not implement sending emails.
- **Calendar**: The adapter (`src/lib/providers/calendar.ts`) ONLY supports event creation. Updates and deletions are not implemented.

## Prerequisites

1. A Google Cloud project with the following APIs enabled:
   - Gmail API
   - Google Calendar API
2. OAuth 2.0 Client credentials created in Google Cloud Console.

## Minimal Scopes Required

- `https://www.googleapis.com/auth/gmail.compose` (Draft creation only)
- `https://www.googleapis.com/auth/calendar.events` (Event creation only)

## Setup Instructions

1. Go to Google Cloud Console.
2. Navigate to APIs & Services > Credentials.
3. Create OAuth 2.0 Client ID.
4. Set Authorized Redirect URIs to your Supabase/Vercel domains, e.g. `https://your-domain.com/api/integrations/google/callback`.
5. Once secure storage (like Supabase Vault) is available, implement the logic in `/api/integrations/google/callback` to securely encrypt and store the refresh token. 
6. Ensure the `connected_accounts` table only stores public metadata (provider, email, scopes).
