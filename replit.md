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
- **Authentication**: Email/password login and signup
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
  - Logged-in user is creator of 2 groups (Kudu watchers, Katutura/Outjo) for settings access
- **Profile**: View user info, trust score, subscription status, profile picture upload (camera button), Renew/Upgrade navigates to /subscribe
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
React Native Expo app - fully offline with mock data replicating the web app exactly.

- **App.tsx** - Main navigation setup with bottom tabs + stack screens (IncidentDetails, Subscribe, GroupChat, CreateGroup)
- **src/screens/** - All app screens:
  - Login, Signup - Authentication
  - FeedScreen - Posts with images, ad cards between every 2 posts (alternating Mwaikange and Ngumu ads), clickable posts navigate to IncidentDetails
  - IncidentDetailsScreen - Full post detail matching web post-detail.tsx (badges, details grid, upvote/downvote, like, share, follow, tabs for Timeline/Media/Comments with working comment posting)
  - MapScreen - Incident markers from posts, blue dot for current location, clickable markers with popup and View Details navigation to IncidentDetails
  - ReportScreen - 3-step report form with expo-image-picker for photo attachments
  - GroupsScreen - Groups listing with Create Group and Open/Join buttons
  - CreateGroupScreen - Form to create new group (name, area, public/private toggle)
  - GroupChatScreen - Full group chat with messages, image sharing via expo-image-picker, members modal, settings modal (creator), join/request flow
  - ProfileScreen - User profile with avatar upload via expo-image-picker, Renew/Upgrade navigates to Subscribe
  - SubscribeScreen - 12 subscription plans matching web exactly, WhatsApp payment redirect
- **src/lib/api.ts** - Mock API with local images (post1-4.jpg), comments, timeline events, votes, group messages (with imageUrl), group members, avatar update
- **src/lib/types.ts** - Types including Comment, TimelineEvent, PostVotes, GroupMessage (with imageUrl), GroupMember, GroupJoinRequest
- **assets/** - App icons, splash screens, post images (post1-4.jpg), launcher.png (login logo), mwaikange-logo.png, ngumu-logo.jpg

**IMPORTANT**: Mobile app must always replicate web app 1:1 for all screens and sub-pages.
**Image Picker**: All image selection on mobile uses `expo-image-picker` (Google Play Store compliant) - used in ReportScreen, GroupChatScreen, and ProfileScreen.

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
