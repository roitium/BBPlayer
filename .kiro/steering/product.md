# BBPlayer Product Overview

BBPlayer is a lightweight Bilibili audio player built with React Native and Expo. It provides a streamlined music listening experience by focusing solely on audio playback from Bilibili videos, avoiding the bloat of the main Bilibili client.

## Core Features

- **Bilibili Authentication**: QR code and manual cookie login support
- **Multiple Audio Sources**:
  - User favorites/playlists
  - Video collections and subscriptions
  - Multi-part videos (via `[mp]` prefixed favorites)
  - Uploader content
- **Full-featured Player**: Play/pause, repeat modes, shuffle, queue management
- **Search**: Global Bilibili search and personal favorites search
- **Material Design 3**: Modern UI following Material Design principles

## Target Platform

- **Primary**: Android (React Native)
- **Architecture**: Online-first (all data from Bilibili APIs, minimal local storage)
- **Future**: Planning local storage expansion with Drizzle ORM + SQLite

## User Experience Focus

- Lightweight and fast compared to official Bilibili app
- Audio-focused interface without video distractions
- Seamless playback with queue management
- Material Design 3 theming with dynamic colors
