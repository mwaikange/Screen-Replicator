# Ngumu's Eye - Community Safety Platform

## Overview
A mobile-first community safety platform for reporting incidents, tracking missing persons, and coordinating neighborhood watch groups. Built with React frontend, Express backend, and a separate React Native mobile app integrated with Supabase backend.

## Project Structure

### Web App - Frontend (client/src/)
- **pages/** - Page components
  - `login.tsx` - User authentication
  - `signup.tsx` - User registration
  - `feed.tsx` - Community feed with posts
  - `map.tsx` - Incident map with severity markers
  - `report.tsx` - Multi-step incident reporting form with image upload
  - `groups.tsx` - Community groups listing with create group dialog
  - `group-chat.tsx` - Group chat page with messages, image sharing, members modal, settings modal (creator), join requests
  - `profile.tsx` - User profile with avatar upload and subscription
  - `subscribe.tsx` - Subscription plans with WhatsApp payment redirect
  - `post-detail.tsx` - Post detail with comments, timeline, voting

- **components/**
  - `bottom-nav.tsx` - Mobile bottom navigation bar
  - `page-header.tsx` - Page header with logo and notifications

### Backend (server/)
- `index.ts` - Express server with session middleware, 20MB body limit
- `routes.ts` - API endpoints for auth, posts, groups, group chat, members, join requests, avatar upload
- `storage.ts` - In-memory storage with sample data including group members, messages, and join requests

### Shared (shared/)
- `schema.ts` - TypeScript types and Zod schemas for data validation (User, Post, Group, Comment, TimelineEvent, PostVotes, GroupMessage with imageUrl, GroupMember, GroupJoinRequest)

## Features
- **Authentication**: Email/password login and signup via Supabase Auth
- **Feed**: View community posts with filters (All, Nearby, Verified, Following), ad cards (Mwaikange) after every 2 posts, alternating with Ngumu's Eye ads
- **Map**: Visual incident map with clickable markers from posts, blue dot for current location, popup with View Details navigating to post detail
- **Report**: 3-step form for reporting incidents with image upload (expo-image-picker on mobile)
- **Groups**: Full group management system:
  - Create new groups (public or private) with name and area
  - Group chat with real-time messaging and image sharing
  - Image attachment button in chat input bar
  - Members list with role display (creator/admin/member)
  - Creator can: edit settings, remove members, approve/deny join requests, delete group
  - Public groups: instant join
  - Private groups: request-to-join with approval flow
  - Leave group option for non-creator members
- **Case Deck (My File Deck)**: Full case management system:
  - View all user cases with status/priority filters
  - Open new cases with type selection, priority, evidence upload
  - Case detail with description, evidence, documents tabs
  - Status management (open, in_progress, closed, archived)
  - Quick links to Device Tracking and Counseling
- **Device Tracking**: Register and track devices (phone, tablet, laptop)
  - Report lost/stolen status
  - Mark as recovered
  - IMEI tracking support
- **Counseling & Support**: Access support services
  - Emergency hotline with direct call/WhatsApp
  - Support types: Emergency, Counseling, Legal Aid, Medical
  - Preferred contact method selection
  - Confidential request submission
- **Profile**: View user info, trust score, subscription status, profile picture upload (camera button), Renew/Upgrade navigates to /subscribe, My Case Deck button
- **Subscribe**: Subscription plans page with 12 plans across 3 categories (Individual: 1/3/6/12 months, Family: 1/3/6/12 months, Tourist: 5/10/14/30 days), active subscription banner at top, Pay Now buttons redirect to WhatsApp with pre-filled message including plan name and price, WhatsApp contact card at bottom

## API Endpoints
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/signup` - Register new user
- `GET /api/user` - Get current user profile
- `POST /api/user/avatar` - Upload profile picture (multipart form)
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get single post with votes
- `GET /api/posts/:id/comments` - Get post comments
- `POST /api/posts/:id/comments` - Add comment
- `GET /api/posts/:id/timeline` - Get post timeline
- `POST /api/posts/:id/vote` - Vote on post
- `POST /api/posts/:id/like` - Toggle like on post
- `POST /api/upload` - Upload files
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create new group
- `GET /api/groups/:id` - Get group with membership status
- `PATCH /api/groups/:id` - Update group settings
- `DELETE /api/groups/:id` - Delete group
- `GET /api/groups/:id/messages` - Get group messages (includes imageUrl)
- `POST /api/groups/:id/messages` - Send group message (text + optional imageUrl)
- `GET /api/groups/:id/members` - Get group members
- `POST /api/groups/:id/join` - Join or request to join group
- `POST /api/groups/:id/leave` - Leave group
- `DELETE /api/groups/:id/members/:userId` - Remove member (creator only)
- `GET /api/groups/:id/requests` - Get pending join requests
- `POST /api/groups/:id/requests/:requestId/approve` - Approve join request
- `POST /api/groups/:id/requests/:requestId/deny` - Deny join request

## Test Credentials
- Email: ngocbo@yopmail.com
- Password: password123

### Mobile App (mobile/)
React Native Expo app integrated with Supabase backend (https://app.ngumus-eye.site).

- **App.tsx** - Main navigation setup with bottom tabs (Feed, Map, Report, Files/CaseDeck, Groups, Profile) + stack screens (IncidentDetails, Subscribe, GroupChat, CreateGroup, CaseDetail, OpenNewCase, DeviceTracking, Counseling)
- **src/lib/supabase.ts** - Supabase client with expo-secure-store for auth token persistence
- **src/lib/api.ts** - Full Supabase API layer (auth, posts/incidents, groups, cases, devices, support)
- **src/lib/types.ts** - Types including Case, TrackedDevice, SupportRequest, CaseEvidence, CaseDocument
- **src/lib/theme.ts** - Design system colors, spacing, font sizes
- **src/screens/** - All app screens:
  - LoginScreen, SignupScreen - Supabase authentication
  - FeedScreen - Posts from incidents table with likes/comments/votes
  - IncidentDetailsScreen - Full post detail with upvote/downvote, comments, timeline
  - MapScreen - Incident markers from posts with location data
  - ReportScreen - 3-step report form with expo-image-picker, uploads to Supabase
  - GroupsScreen - Groups listing with Create Group and Open/Join buttons
  - CreateGroupScreen - Form to create new group (uses create_group_with_creator RPC)
  - GroupChatScreen - Full group chat with messages, image sharing, members, settings
  - CaseDeckScreen - Case listing with filters (All/Open/Active/Closed), links to Device Tracking and Counseling
  - OpenNewCaseScreen - Multi-field case creation form with evidence upload
  - CaseDetailScreen - Case details with evidence gallery, documents, status management
  - DeviceTrackingScreen - Device registration and status management (active/lost/stolen/recovered)
  - CounselingScreen - Support request form with emergency hotline (+264816802064)
  - ProfileScreen - User profile with avatar upload, subscription, sign out via Supabase
  - SubscribeScreen - 12 subscription plans, WhatsApp payment redirect
- **assets/** - App icons, splash screens, post images (post1-4.jpg), launcher.png, mwaikange-logo.png, ngumu-logo.jpg

**IMPORTANT**: Mobile app must always replicate web app 1:1 for all screens and sub-pages.
**Image Picker**: All image selection on mobile uses `expo-image-picker` (Google Play Store compliant) - used in ReportScreen, GroupChatScreen, ProfileScreen, and OpenNewCaseScreen.

### Supabase Integration
- **Config**: `app.config.js` passes env vars via `expo.extra`; `supabase.ts` reads via `expo-constants` (`Constants.expoConfig.extra`)
- **Auth**: signInWithPassword / signUp with expo-secure-store for session persistence
- **Database tables**: profiles, incidents, incident_types, incident_media, incident_comments, incident_likes, incident_votes, incident_timeline, groups, group_members, group_messages, group_join_requests, user_subscriptions, cases, tracked_devices, support_requests
- **Incidents schema**: `id, type_id, title, description, town, lat, lng, status, verification_level, created_at, created_by` with FK to `incident_types(id, code, label, severity)`, `profiles:created_by(...)`, and related `incident_media(id, path, mime)`
- **RPCs**: create_group_with_creator, request_join_group, approve_group_request
- **File uploads**: POST to https://app.ngumus-eye.site/api/upload with Bearer token
- **Environment secrets**: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_SITE_URL (passed through app.config.js extra)

#### Building the Mobile App
```bash
cd mobile
npm install
npx expo start           # Development
eas build --platform android --profile preview  # Build APK
```

## Design System
- Primary color: Blue (#1d9bf0)
- Mobile-first responsive design
- Bottom navigation for app-like experience
- Case status colors: open=yellow, in_progress=purple, closed=green, archived=gray
- Priority colors: low=green, medium=yellow, high=red, critical=dark red
