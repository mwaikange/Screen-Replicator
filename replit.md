# Ngumu's Eye - Community Safety Platform

## Overview

Ngumu's Eye is a mobile-first community safety platform that enables users to report incidents, track missing persons, and coordinate neighborhood watch groups. The application provides a social feed for community alerts, an interactive incident map, group coordination features, and user profile management with subscription tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state caching and synchronization
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with hot module replacement

The frontend follows a page-based structure under `client/src/pages/` with shared components in `client/src/components/`. Pages include login, signup, feed, map, report, groups, and profile. The bottom navigation provides mobile app-like navigation between main sections.

### Backend Architecture
- **Framework**: Express.js 5 running on Node.js
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful JSON APIs under `/api` prefix
- **Session Management**: Express session (configured for connect-pg-simple with PostgreSQL)

The server uses a modular structure with route registration in `server/routes.ts` and storage abstraction in `server/storage.ts`. Currently implements in-memory storage (`MemStorage`) with a defined interface (`IStorage`) for easy database migration.

### Data Layer
- **ORM**: Drizzle ORM configured for PostgreSQL
- **Schema Definition**: Shared schema in `shared/schema.ts` using Zod for validation
- **Database Migrations**: Drizzle Kit with migrations output to `./migrations`

The schema currently defines Users, Posts, and Groups with TypeScript types and Zod validation schemas for insert operations. The storage interface pattern allows swapping between in-memory and database implementations.

### Build System
- **Development**: Vite dev server with HMR proxied through Express
- **Production**: Custom build script using esbuild for server bundling and Vite for client
- **Output**: Server builds to `dist/index.cjs`, client to `dist/public`

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **Drizzle ORM**: Database toolkit for type-safe queries and migrations
- **connect-pg-simple**: PostgreSQL session store for Express

### UI Framework
- **Radix UI**: Headless accessible component primitives (accordion, dialog, dropdown, etc.)
- **shadcn/ui**: Pre-styled component collection using Radix and Tailwind
- **Lucide React**: Icon library

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, and dev banner for Replit environment
- **TypeScript**: Strict mode enabled with path aliases (@/, @shared/, @assets/)