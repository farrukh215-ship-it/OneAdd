# Mobile QA Checklist

## Devices
- 1 low-end Android device
- 1 mid-range Android device
- 1 recent Android device

## Auth
- Sign up with OTP
- Sign in
- Forgot password reset
- Logout and login recovery

## Listings
- Create listing with images
- Open listing detail
- Reveal phone
- Send WhatsApp
- Public chat image upload
- Save/unsave listing
- Edit own listing
- Mark pending / sold / inactive / active

## Feed and Search
- Personalized home feed loads
- Browse infinite scroll
- Pull to refresh
- Recent searches
- Popular searches
- Category browse
- Nearby mode

## Notifications
- Expo permission prompt
- Push token registration
- Receive push on contact
- Notification inbox read/unread state
- Notification preference toggles

## Offline and Resume
- Launch with poor network
- Resume from background
- Cached feed appears
- Detail image thumbnails warm correctly

## Release Gate
- No redbox / fatal JS crash
- API base URL is production
- Version and versionCode bumped
- EAS build passes
- Internal track smoke test passes
