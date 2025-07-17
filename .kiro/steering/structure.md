---
inclusion: always
---

# Project Structure & Code Conventions

## Directory Structure

```text
├── app/                    # Expo Router screens (file-based routing)
├── components/             # Reusable UI components
├── hooks/                  # Custom React hooks
├── lib/                    # Core business logic and utilities
├── types/                  # TypeScript type definitions
├── utils/                  # Pure utility functions
├── constants/              # App constants and configuration
├── assets/                 # Static assets (images, etc.)
└── patches/                # Package patches
```

## Key Directories

### `app/` - Expo Router Screens

- File-based routing with nested layouts
- `layout.tsx` - Root layout with providers
- `tabs/` - Bottom tab navigation screens
- `player/` - Audio player with components and hooks
- `playlist/` - Playlist screens by type (collection, favorite, local, etc.)

### `components/` - UI Components

- Feature-organized: `modals/`, `playlist/`, `providers/`, `toast/`
- Reusable components at root level
- Use React Native Paper for Material Design 3

### `hooks/` - Custom Hooks

- `queries/` - React Query hooks organized by API (`bilibili/`, `db/`)
- `stores/` - Zustand store hooks with MMKV persistence
- `playerHooks/` - Player-specific logic
- `utils/` - Utility hooks

### `lib/` - Core Logic

- `api/` - API clients with neverthrow error handling
- `player/` - Audio player logic and services
- `services/` - Business logic services
- `config/` - App configuration (React Query, Sentry)

### `types/` - TypeScript Definitions

- `apis/` - API response types
- `core/` - App domain types (media, stores)
- `navigation.ts` - Navigation type safety

## Code Conventions

### Naming

- **Files**: kebab-case for utilities, PascalCase for React components
- **Directories**: lowercase with descriptive names
- **Components**: PascalCase with descriptive names
- **Hooks**: camelCase starting with `use`
- **Types**: PascalCase with descriptive suffixes (`Response`, `Params`, `Store`)

### Imports

- Use `@/` path aliases for root-relative imports
- Organize imports: external → internal → relative
- Create barrel exports (`index.ts`) for clean imports
- Prettier handles import sorting automatically

### Error Handling

- Use **neverthrow** `Result<T, E>` types for API calls and fallible operations
- Avoid throwing exceptions in business logic
- Handle errors at component boundaries with error boundaries

### State Management

- **Zustand** for global state with MMKV persistence
- **React Query** for server state and caching
- Custom hooks to encapsulate state logic
- Avoid prop drilling with context providers

### Component Patterns

- Functional components with TypeScript
- Custom hooks for reusable logic
- Feature-based component organization
- Material Design 3 components from React Native Paper
- Separate container and presentational components

### API Integration

- Centralized API clients in `lib/api/`
- Transform API responses to app domain types
- Use React Query for data fetching and caching
- Handle authentication state globally
