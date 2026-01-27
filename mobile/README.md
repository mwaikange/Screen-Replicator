# Ngumu's Eye Mobile App

React Native mobile app built with Expo for the Ngumu's Eye community safety platform.

## Features

- **Authentication**: Secure login and signup with validation
- **Community Feed**: View and filter incident reports with FlatList optimization
- **Incident Map**: Visual map showing incident locations by severity
- **Report Incidents**: Multi-step form with location capture and image upload
- **Community Groups**: Join and manage neighborhood watch groups
- **User Profile**: View trust score, subscription status, and followers

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

**Development Build (for testing with Expo Go):**
```bash
npx expo start
```

**Preview APK (standalone APK for testing):**
```bash
eas build --platform android --profile preview
```

**Production Build (App Bundle for Play Store):**
```bash
eas build --platform android --profile production
```

## Project Structure

```
mobile/
├── App.tsx                 # Main app entry with navigation
├── app.json                # Expo configuration with permissions
├── eas.json                # EAS Build configuration
├── package.json            # Dependencies
├── babel.config.js         # Babel configuration with Reanimated
├── assets/                 # App icons and splash screens
└── src/
    ├── lib/
    │   ├── api.ts          # API client with axios
    │   ├── theme.ts        # Colors, spacing, typography
    │   └── types.ts        # TypeScript types
    └── screens/
        ├── LoginScreen.tsx     # Login with validation
        ├── SignupScreen.tsx    # User registration
        ├── FeedScreen.tsx      # Optimized feed with FlatList
        ├── MapScreen.tsx       # Incident map
        ├── ReportScreen.tsx    # Multi-step incident form
        ├── GroupsScreen.tsx    # Community groups
        └── ProfileScreen.tsx   # User profile
```

## Mobile Optimizations

- **Performance**: React.memo, useCallback, FlatList with optimized rendering
- **Touch Targets**: Minimum 44x44pt touch targets for accessibility
- **Keyboard Handling**: KeyboardAvoidingView on all forms
- **Safe Areas**: Proper handling for iOS notch and Android navigation
- **Form Validation**: Client-side validation with error messages
- **Image Optimization**: expo-image-picker with compression

## Permissions

The app requests the following permissions:
- **Location**: For incident location tagging
- **Camera**: For capturing incident photos
- **Photo Library**: For uploading existing photos

## API Connection

The mobile app connects to the same backend API as the web app. Make sure to:
1. Deploy your web app to get a public URL
2. Update the `apiUrl` in `app.json` extra section with your deployment URL

## Notes

- The Files tab is disabled (coming soon)
- Uses React Navigation for bottom tabs and stack navigation
- Uses Ionicons for consistent iconography
- Matches the web app's blue color theme (#1d9bf0)
- Owner is set to "referredby" in app.json
