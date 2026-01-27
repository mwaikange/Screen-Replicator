# Ngumu's Eye - Community Safety Platform

## Overview
A mobile-first community safety platform for reporting incidents, tracking missing persons, and coordinating neighborhood watch groups. Built with React frontend and Express backend.

## Project Structure

### Frontend (client/src/)
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
- **Feed**: View community posts with filters (All, Nearby, Verified, Following)
- **Map**: Visual incident map with severity legend (Critical, High, Medium, Low)
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

## Design System
- Primary color: Blue (#1d9bf0)
- Mobile-first responsive design
- Bottom navigation for app-like experience
