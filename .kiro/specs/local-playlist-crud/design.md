# Design Document

## Overview

This design implements comprehensive CRUD operations for local playlists in BBPlayer, extending the existing database schema and React Query patterns. The solution leverages the current Drizzle ORM setup, follows established error handling patterns with neverthrow, and integrates seamlessly with the existing UI components and navigation structure.

## Architecture

### Database Layer

- **Drizzle ORM**: Continue using the existing schema with `playlists`, `tracks`, `artists`, and `playlistTracks` tables
- **SQLite**: Local storage via Expo SQLite with the current `db.db` database
- **Transactions**: Use Drizzle transactions for complex operations involving multiple tables

### Service Layer

- **Playlist Service**: New service module for encapsulating all playlist CRUD operations
- **Track Service**: Extended service for track management within playlists
- **Error Handling**: Leverage existing `DatabaseError` class and neverthrow Result types

### Query Layer

- **React Query**: Extend existing `usePlaylist.ts` hooks with mutation capabilities
- **Cache Management**: Implement proper cache invalidation and optimistic updates
- **Query Keys**: Follow established pattern with hierarchical query keys

### UI Layer

- **Existing Components**: Reuse `PlaylistHeader`, `TrackListItem`, and modal components
- **New Components**: Create playlist creation/editing forms and confirmation dialogs
- **Navigation**: Integrate with existing React Navigation structure

## Components and Interfaces

### Core Services

#### PlaylistService (`lib/services/playlistService.ts`)

```typescript
interface PlaylistService {
	createPlaylist(
		data: CreatePlaylistData,
	): Promise<Result<Playlist, DatabaseError>>
	updatePlaylist(
		id: number,
		data: UpdatePlaylistData,
	): Promise<Result<Playlist, DatabaseError>>
	deletePlaylist(id: number): Promise<Result<void, DatabaseError>>
	addTrackToPlaylist(
		playlistId: number,
		trackData: TrackData,
	): Promise<Result<void, DatabaseError>>
	removeTrackFromPlaylist(
		playlistId: number,
		trackId: number,
	): Promise<Result<void, DatabaseError>>
	reorderPlaylistTracks(
		playlistId: number,
		trackOrders: TrackOrder[],
	): Promise<Result<void, DatabaseError>>
}
```

#### TrackService (`lib/services/trackService.ts`)

```typescript
interface TrackService {
	createOrUpdateTrack(
		trackData: TrackData,
	): Promise<Result<Track, DatabaseError>>
	findTrackByBvid(bvid: string): Promise<Result<Track | null, DatabaseError>>
	createArtistIfNotExists(
		artistData: ArtistData,
	): Promise<Result<Artist, DatabaseError>>
}
```

### Data Transfer Objects

#### Playlist DTOs

```typescript
interface CreatePlaylistData {
	title: string
	description?: string
	coverUrl?: string
}

interface UpdatePlaylistData {
	title?: string
	description?: string
	coverUrl?: string
}

interface TrackData {
	bvid: string
	cid?: number
	title: string
	artistName?: string
	artistId?: number
	coverUrl?: string
	duration?: number
	isMultiPage: boolean
}

interface TrackOrder {
	trackId: number
	order: number
}
```

### Extended React Query Hooks

#### Mutations (`hooks/queries/db/usePlaylistMutations.ts`)

```typescript
interface PlaylistMutations {
	useCreatePlaylist(): UseMutationResult<
		Playlist,
		DatabaseError,
		CreatePlaylistData
	>
	useUpdatePlaylist(): UseMutationResult<
		Playlist,
		DatabaseError,
		{ id: number; data: UpdatePlaylistData }
	>
	useDeletePlaylist(): UseMutationResult<void, DatabaseError, number>
	useAddTrackToPlaylist(): UseMutationResult<
		void,
		DatabaseError,
		{ playlistId: number; trackData: TrackData }
	>
	useRemoveTrackFromPlaylist(): UseMutationResult<
		void,
		DatabaseError,
		{ playlistId: number; trackId: number }
	>
	useReorderPlaylistTracks(): UseMutationResult<
		void,
		DatabaseError,
		{ playlistId: number; trackOrders: TrackOrder[] }
	>
}
```

### UI Components

#### PlaylistCreateModal (`components/modals/PlaylistCreateModal.tsx`)

- Form with title and description fields
- Validation for required fields
- Integration with create mutation
- Success/error handling with toast notifications

#### PlaylistEditModal (`components/modals/PlaylistEditModal.tsx`)

- Pre-populated form with existing playlist data
- Same validation as create modal
- Integration with update mutation

#### PlaylistDeleteDialog (`components/modals/PlaylistDeleteDialog.tsx`)

- Confirmation dialog with playlist title
- Warning about permanent deletion
- Integration with delete mutation

#### AddToPlaylistModal (`components/modals/AddToPlaylistModal.tsx`)

- List of available local playlists
- Search/filter functionality for large playlist collections
- Integration with add track mutation

## Data Models

### Database Schema Extensions

The existing schema already supports all required functionality:

- `playlists` table with `type: 'local'` for local playlists
- `tracks` table for storing track metadata
- `artists` table for artist information
- `playlistTracks` table with `order` field for track sequencing

### Type Extensions

```typescript
// Extend existing Playlist interface
interface LocalPlaylist extends Playlist {
	source: 'local'
	type: 'local'
	isEditable: true
}

// Track with playlist context
interface PlaylistTrack extends Track {
	playlistOrder: number
	addedAt: Date
	hasMetadata: true
}
```

## Error Handling

### Error Types

- **ValidationError**: For form validation failures
- **DatabaseError**: For database operation failures (existing)
- **ConflictError**: For duplicate track additions
- **NotFoundError**: For missing playlist/track references

### Error Recovery

- **Optimistic Updates**: Revert UI changes on mutation failure
- **Retry Logic**: Automatic retry for transient database errors
- **User Feedback**: Clear error messages with actionable suggestions

### Error Boundaries

- Wrap playlist components in error boundaries
- Graceful degradation for partial failures
- Sentry integration for error tracking (existing pattern)

## Performance Considerations

### Database Optimization

- **Indexes**: Ensure proper indexing on frequently queried fields
- **Batch Operations**: Use transactions for multi-record operations
- **Query Optimization**: Minimize N+1 queries with proper joins

### UI Performance

- **Virtualization**: Use FlatList/LegendList for large track lists
- **Memoization**: Memoize expensive computations and renders
- **Debouncing**: Debounce search and filter operations

### Cache Strategy

- **Stale-While-Revalidate**: Keep UI responsive with cached data
- **Selective Invalidation**: Invalidate only affected cache entries
- **Optimistic Updates**: Immediate UI feedback for better UX

## Security Considerations

### Data Validation

- **Input Sanitization**: Sanitize all user inputs before database operations
- **Schema Validation**: Validate data against expected schemas
- **SQL Injection Prevention**: Use parameterized queries (handled by Drizzle)

### Access Control

- **Local Data Only**: All operations are on local database
- **User Isolation**: No cross-user data access concerns
- **Data Integrity**: Maintain referential integrity with foreign keys

## Migration Strategy

### Database Migrations

- No schema changes required (existing schema supports all features)
- Seed data for testing and development
- Migration scripts for future schema updates

### Code Migration

- Gradual rollout of new components
- Backward compatibility with existing playlist views
- Feature flags for controlled release

### User Experience

- Smooth transition from read-only to full CRUD
- Clear indication of local vs. online playlists
- Migration tools for importing online playlists to local (future feature)
