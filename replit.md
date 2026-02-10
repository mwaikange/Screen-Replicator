# Ngumu's Eye - Community Safety Platform

## Overview
A mobile-first community safety platform for reporting incidents, tracking missing persons, and coordinating neighborhood watch groups. Built with React frontend, Express backend, and a separate React Native mobile app.

## Project Structure

### Web App - Frontend (client/src/)
- **pages/** - Page components
  - `login.tsx` - User authentication
  - `signup.tsx` - User registration
  - `feed.tsx` - Community feed with posts
  - `map.tsx` - Incident map with severity markers
  - `report.tsx` - Multi-step incident reporting form
  - `groups.tsx` - Community groups listing
  - `profile.tsx` - User profile and subscription

- **components/**
  - `bottom-nav.tsx` - Mobile bottom navigation bar
  - `page-header.tsx` - Page header with logo and notifications

### Backend (server/)
- `index.ts` - Express server with session middleware
- `routes.ts` - API endpoints for auth, posts, groups, user
- `storage.ts` - In-memory storage with sample data

### Shared (shared/)
- `schema.ts` - TypeScript types and Zod schemas for data validation

## Features
- **Authentication**: Email/password login and signup
- **Feed**: View community posts with filters (All, Nearby, Verified, Following), ad cards (Mwaikange) after every 2 posts, alternating with Ngumu's Eye ads
- **Map**: Visual incident map with clickable markers from posts, blue dot for current location, popup with View Details navigating to post detail
- **Report**: 3-step form for reporting incidents with location
- **Groups**: Join or create community watch groups
- **Profile**: View user info, trust score, subscription status

## API Endpoints
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/signup` - Register new user
- `GET /api/user` - Get current user profile
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create new group

## Test Credentials
- Email: ngocbo@yopmail.com
- Password: password123

### Mobile App (mobile/)
React Native Expo app - fully offline with mock data replicating the web app exactly.

- **App.tsx** - Main navigation setup with bottom tabs + IncidentDetails stack screen
- **src/screens/** - All app screens:
  - Login, Signup - Authentication
  - FeedScreen - Posts with images, ad cards between every 2 posts (alternating Mwaikange and Ngumu ads), clickable posts navigate to IncidentDetails
  - IncidentDetailsScreen - Full post detail matching web post-detail.tsx (badges, details grid, upvote/downvote, like, share, follow, tabs for Timeline/Media/Comments with working comment posting)
  - MapScreen - Incident markers from posts, blue dot for current location, clickable markers with popup and View Details navigation to IncidentDetails
  - ReportScreen, GroupsScreen, ProfileScreen
- **src/lib/api.ts** - Mock API with local images (post1-4.jpg), comments, timeline events, votes
- **src/lib/types.ts** - Types including Comment, TimelineEvent, PostVotes
- **assets/** - App icons, splash screens, post images (post1-4.jpg), launcher.png (login logo), mwaikange-logo.png, ngumu-logo.jpg

**IMPORTANT**: Mobile app must always replicate web app 1:1 for all screens and sub-pages.

#### Building the Mobile App
```bash
cd mobile
npm install
npx expo start           # Development
eas build --platform android --profile preview  # Build APK
```

**Important**: Update `apiUrl` in `mobile/app.json` with your deployment URL before building.

## Design System
- Primary color: Blue (#1d9bf0)
- Mobile-first responsive design
- Bottom navigation for app-like experience
- Files tab is disabled (coming soon)
