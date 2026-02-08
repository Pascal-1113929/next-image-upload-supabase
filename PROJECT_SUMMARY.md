# TrainSpotter - Photo Upload & Viewing Application

A Next.js application for uploading and viewing train photos with automatic metadata extraction including GPS location and station detection.

## Features Created

### 🔐 Authentication

- Login modal with Supabase Auth
- Support for Magic Link and GitHub OAuth
- Login page at `/login`
- Automatic session management

### 📸 Photo Upload

- Smart photo upload modal with metadata extraction
- Automatic date/time extraction from EXIF data
- GPS coordinate extraction
- Nearest train station detection based on GPS
- Optional title and description
- Privacy controls (public/private)
- File stored in Supabase Storage (`train-images` bucket)

### 🖼️ Photo Viewing

- **Home Page** (`/`) - Landing page with features and call-to-action
- **Gallery** (`/photos`) - Browse all public train photos
- **Photo Detail** (`/photos/[id]`) - View individual photos with full metadata
- **My Photos** (`/my-photos`) - Manage your uploaded photos (delete, view)

### 🎨 UI Components

- Modern UI built with shadcn/ui components
- Responsive navigation header
- Card-based photo grid layout
- Loading states and animations
- Toast notifications for user feedback

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Database**: Supabase PostgreSQL with PostGIS
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **UI**: shadcn/ui + Tailwind CSS
- **State**: Zustand
- **Forms**: React Hook Form
- **Metadata**: exifr library

## Files Created

### Pages

- `app/page.tsx` - Home/landing page
- `app/photos/page.tsx` - Photo gallery
- `app/photos/[id]/page.tsx` - Photo detail page
- `app/my-photos/page.tsx` - User's photos management
- `app/login/page.tsx` - Login page
- `app/layout.tsx` - Updated with Header

### Components

- `components/Header.tsx` - Navigation header
- `components/modals/PhotoUploadModal.tsx` - Upload modal with metadata extraction
- `components/modals/AuthModal.tsx` - Updated authentication modal

### Hooks

- `hooks/useUser.ts` - User authentication hook
- `hooks/useAuthModal.ts` - Auth modal state
- `hooks/useUploadModal.ts` - Upload modal state
- `hooks/usePhotoUploadModal.ts` - Photo upload modal state

### Libraries

- `lib/supabase.ts` - Supabase client configuration
- `lib/metadata.ts` - EXIF metadata extraction utilities

### Providers

- `providers/UserProvider.tsx` - User context provider
- `providers/ModalProvider.tsx` - Updated with PhotoUploadModal

## How to Use

### Setup

1. Ensure Supabase project is configured with environment variables:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
   ```

2. Run database migrations (already exists in `supabase/migrations/`)

3. Seed train stations data:

   ```bash
   pnpm db:seed
   ```

4. Start development server:
   ```bash
   pnpm dev
   ```

### Uploading Photos

1. Log in using the "Login" button in header
2. Click "Upload Photo" button
3. Select an image file
4. App automatically:
   - Extracts capture date/time
   - Reads GPS coordinates (if available)
   - Suggests nearest train station
5. Optionally add title and description
6. Choose privacy setting
7. Click "Upload Photo"

### Viewing Photos

- Browse public photos at `/photos`
- Click any photo to see details and metadata
- View your uploaded photos at `/my-photos`
- Delete your own photos from the My Photos page

## Metadata Extraction

The app uses the `exifr` library to extract:

- **Date/Time**: When the photo was taken
- **GPS Coordinates**: Latitude and longitude
- **Camera Info**: Make and model
- **Dimensions**: Image width and height
- **Orientation**: Image rotation

When GPS data is found, the app calculates the nearest train station from the database using the Haversine formula.

## Database Schema

Uses existing schema from `supabase/migrations/20260208140536_init_schema.sql`:

- `train_images` - Photos with metadata
- `train_stations` - Station locations with GPS coordinates
- `profiles` - User profiles
- Storage bucket: `train-images`

## Dependencies Added

- `zustand` - State management for modals
- `@supabase/ssr` - Supabase client for Next.js
- `react-icons` - Icon library
- `@radix-ui/react-dialog` - Dialog primitives

## Next Steps

To enhance the application, consider:

1. Add search and filtering to photo gallery
2. Implement photo editing capabilities
3. Add comments and likes functionality
4. Create user profiles with photo collections
5. Add map view showing photo locations
6. Implement batch upload
7. Add photo sharing capabilities
8. Create photo albums/collections

## Notes

- The existing `UploadModal.tsx` is for song uploads and remains unchanged
- Row Level Security (RLS) policies ensure users can only delete their own photos
- Private photos are only visible to the uploader
- Public photos appear in the main gallery for all visitors
