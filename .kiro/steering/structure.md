# Project Structure & Organization

## Root Structure

```
├── app/                    # Expo Router app directory (main screens)
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Core business logic and utilities
├── types/                  # TypeScript type definitions
├── utils/                  # Pure utility functions
├── constants/              # App constants and configuration
├── assets/                 # Static assets (images, etc.)
└── patches/                # Package patches
```

## App Directory (`app/`)

- **Expo Router** file-based routing structure
- **layout.tsx** - Root layout with providers
- **tabs/** - Bottom tab navigation screens
- **player/** - Audio player screen and components
- **playlist/** - Playlist-related screens
- **search-result/** - Search result screens

## Components (`components/`)

- **Organized by feature/type**:
  - `modals/` - Modal components
  - `playlist/` - Playlist-specific components
  - `providers/` - Context providers
  - `toast/` - Toast configuration
- **Reusable UI components** at root level

## Hooks (`hooks/`)

- **playerHooks/** - Player-specific hooks
- **queries/** - React Query hooks organized by API
  - `bilibili/` - Bilibili API query hooks
- **stores/** - Zustand store hooks
- **utils/** - Utility hooks

## Lib (`lib/`)

- **api/** - API clients and related logic
  - `bilibili/` - Complete Bilibili API implementation
  - `netease/` - NetEase API (future feature)
- **config/** - App configuration (query client, Sentry)
- **core/** - Core business logic and errors
- **player/** - Audio player logic and services

## Types (`types/`)

- **apis/** - API response type definitions
- **core/** - Core app types (media, stores, etc.)
- **navigation.ts** - Navigation type definitions
- **global.ts** - Global type augmentations

## Naming Conventions

- **Files**: kebab-case for regular files, PascalCase for React components
- **Directories**: lowercase with descriptive names
- **Components**: PascalCase with descriptive names
- **Hooks**: camelCase starting with `use`
- **Types**: PascalCase with descriptive suffixes (`Response`, `Params`, etc.)

## Import Patterns

- **Path aliases**: Use `@/` for root-relative imports
- **Barrel exports**: Index files for clean imports
- **Import organization**: Prettier plugin handles import sorting

## Architecture Patterns

- **Feature-based organization** where applicable
- **Separation of concerns**: UI, business logic, and data layers
- **Functional error handling** with neverthrow Result types
- **Custom hooks** for reusable logic
- **Provider pattern** for global state and configuration
