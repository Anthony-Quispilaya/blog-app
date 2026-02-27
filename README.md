# Minimal Blog App (Editorial + Voice-to-Post)

Cross-platform blog app (Expo mobile + web) with editorial UI, Supabase auth, and automated voice-to-blog publishing.

## Features

- Google login + persistent user session
- NYT-inspired editorial layout with dark/light theme toggle
- Unified typography system (Questrial / Mate / Source Sans Pro)
- Dynamic feed + detail from Supabase `posts` table (newest first)
- Record audio on web + mobile and auto-create blog post
- Automatic transcription via OpenAI Whisper API
- Transcript persisted as Markdown file in Supabase Storage (`transcripts` bucket)
- OpenAI-generated title + polished blog content from the new transcript
- Public shareable user route (primary): `/blog-view/:username`

Public reading routes (primary):

- `/blog-view/:username`
- `/blog-view/:username/post/:id`

Legacy compatibility (redirects):

- `/u/:username` → `/blog-view/:username`
- `/u/:username/post/:id` → `/blog-view/:username/post/:id`

## Core Architecture

- Source of truth: Supabase Postgres (`profiles`, `posts`)
- Transcript files: Supabase Storage (`transcripts`)
- Voice + AI pipeline runs directly from app client

## Project Structure

- `app/home/index.tsx` — dynamic feed + record button
- `app/post/[id].tsx` — dynamic post detail
- `app/home/profile.tsx` — logout + copy share link
- `app/blog-view/[username].tsx` — public user feed route (primary)
- `app/blog-view/[username]/post/[id].tsx` — public post route (primary)
- `lib/posts.ts` — feed/detail/public queries + voice endpoint call
  and voice pipeline (`audio -> transcript markdown -> AI blog -> post`)
- `lib/profiles.ts` — username provisioning + share URL helper
- `lib/auth-context.tsx` — auth flow + persisted session handling
- `lib/supabaseClient.js` — Supabase client with persistent sessions
- `supabase/migrations/20260225_voice_to_post.sql` — schema + RLS

## 1) Install app dependencies

```bash
npm install
```

## 2) Environment variables

Create `.env` from `.env.example`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
# Use your deployed HTTPS domain here (used for public share links from native)
EXPO_PUBLIC_WEB_URL=https://YOUR_DOMAIN.com
EXPO_PUBLIC_OPENAI_API_KEY=YOUR_OPENAI_API_KEY
```

## 3) Supabase DB + policies

Run migration in Supabase SQL editor:

- `supabase/migrations/20260225_voice_to_post.sql`

This creates:

- `profiles` table
- `posts` table
- `post_visibility` enum
- RLS policies for owner-write/public-read
- `voice-audio` storage bucket + policies
- `transcripts` storage bucket + policies (private per-user transcript files)

## 4) Google OAuth setup

In Supabase + Google Cloud:

- Add Supabase callback to Google OAuth: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: set this to your deployed web app, e.g. `https://YOUR_DOMAIN.com`
- **Additional Redirect URLs** (add the ones you actually use):
  - Web (production): `https://YOUR_DOMAIN.com/login`
  - Web (local dev, optional): `http://localhost:8081/login` (and any other port Expo uses)
  - Native (production builds): `blogapp://auth/callback`
  - Native (Expo Go / dev): the Expo proxy callback URLs you see during sign-in (these vary)

## 5) Run app

```bash
npx expo start --tunnel
```

## Voice-to-post flow test

1. Sign in
2. Tap `Record a post`
3. Record, then stop
4. Wait for processing (`Transcribing, saving transcript, and writing post...`)
5. App automatically saves transcript markdown to storage
6. App automatically generates title/content and publishes post
7. App navigates to created post and feed updates

## Public profile links

- Profile auto-provisions `username` in `profiles` if missing
- Copy button generates: `EXPO_PUBLIC_WEB_URL/blog-view/<username>`
- Anonymous users can open `/blog-view/:username` and read public posts

## Notes

- OpenAI API key is currently used on the client for demo simplicity
- Session persists until explicit logout
