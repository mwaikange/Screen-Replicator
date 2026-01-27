# Ngumu's Eye Mobile App

React Native mobile app built with Expo for the Ngumu's Eye community safety platform.

## Setup

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Update the API URL in `app.json`:
   - Replace `YOUR_REPLIT_URL` with your actual Replit deployment URL

3. Start the development server:
```bash
npx expo start
```

## Building APK

### Prerequisites
1. Install EAS CLI globally:
```bash
npm install -g eas-cli
```

2. Login to Expo:
```bash
eas login
```

3. Configure the project:
```bash
eas build:configure
```

### Build Commands

**Development Build (for testing):**
```bash
eas build --platform android --profile development
```

**Preview APK (standalone APK for testing):**
```bash
eas build --platform android --profile preview
```

**Production Build:**
```bash
eas build --platform android --profile production
```

## Project Structure

```
mobile/
├── App.tsx                 # Main app entry with navigation
├── app.json                # Expo configuration
├── eas.json                # EAS Build configuration
├── package.json            # Dependencies
├── assets/                 # App icons and splash screens
└── src/
    ├── components/         # Reusable components
    ├── lib/
    │   ├── api.ts          # API client
    │   ├── theme.ts        # Colors and styling
    │   └── types.ts        # TypeScript types
    └── screens/
        ├── LoginScreen.tsx
        ├── SignupScreen.tsx
        ├── FeedScreen.tsx
        ├── MapScreen.tsx
        ├── ReportScreen.tsx
        ├── GroupsScreen.tsx
        └── ProfileScreen.tsx
```

## Features

- **Authentication**: Login/Signup screens
- **Feed**: View community posts with filters
- **Map**: Visual incident map with markers
- **Report**: Multi-step incident reporting
- **Groups**: Community groups listing
- **Profile**: User profile and subscription info

## API Connection

The mobile app connects to the same backend API as the web app. Make sure to:
1. Deploy your web app to get a public URL
2. Update the `apiUrl` in `app.json` with your deployment URL

## Notes

- The Files tab is disabled as per requirements
- Uses React Navigation for navigation
- Uses Ionicons for icons
- Matches the web app's blue color theme
