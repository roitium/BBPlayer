# Technology Stack & Build System

## Core Framework

- **React Native 0.79.5** with **Expo SDK 53**
- **TypeScript** with strict mode enabled
- **React 19** with React Compiler enabled

## Key Libraries & Dependencies

### State Management

- **Zustand** - Primary state management with MMKV persistence
- **React Query (@tanstack/react-query)** - Server state management and caching

### UI & Styling

- **React Native Paper** - Material Design 3 components
- **@pchmn/expo-material3-theme** - Dynamic Material 3 theming
- **React Native Reanimated** - Animations and gestures
- **@gorhom/bottom-sheet** - Bottom sheet components

### Audio & Media

- **React Native Track Player** - Core audio playback engine
- **Expo Audio** - Additional audio utilities

### Navigation

- **React Navigation v7** - Navigation with native bottom tabs
- **@bottom-tabs/react-navigation** - Material 3 bottom tabs

### Development & Quality

- **ESLint** with TypeScript, React, and React Query plugins
- **Prettier** with import organization
- **Lefthook** - Git hooks for code quality
- **Sentry** - Error tracking and performance monitoring

## Build Commands

```bash
# Development
pnpm start              # Start Expo development server
pnpm android           # Run on Android device/emulator

# Code Quality
pnpm lint              # Run ESLint
pnpm format            # Run ESLint --fix and Prettier
pnpm test              # Run Jest tests

# Production Build
# Uses EAS Build (see eas.json)
```

## Configuration Files

- **app.config.ts** - Expo configuration with plugins
- **tsconfig.json** - TypeScript with path aliases (`@/*`)
- **metro.config.js** - Metro bundler with Sentry and Reanimated
- **babel.config.js** - Babel with React Compiler and Reanimated plugins

## Error Handling

- **neverthrow** library for functional error handling
- Result types (`Result<T, E>`) used throughout API layer
- Comprehensive error boundaries with Sentry integration
