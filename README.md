# INDlop — Platform with Firebase Backend & Admin Panel

A multi-page social platform for INDlop, built for people, communities, and creators, fully integrated with Firebase services (Authentication, Cloud Firestore Database, and Security Rules) and equipped with an administrative console.

## What's New: Firebase Integration & Admin Panel

1. **Firebase Authentication & User Accounts**
   - User registration and login (Email/Password and Google Sign-In).
   - In-header interactive Auth widget with modal dialogs on all pages.
   - User profile synchronization in Firestore (`/users/{userId}`).
   - Strict role-based permissions preventing privilege escalation.

2. **Cloud Firestore Database**
   - **Contact Messages (`/messages`)**: Real-time storage of contact inquiries, questions, and feedback.
   - **Waitlist Submissions (`/waitlist`)**: Real-time storage of early access reservations with custom handles.
   - **Admin Privileges (`/admins`)**: Authorized administrator mapping and RBAC controls.
   - **Attribute-Based Access Control (ABAC)**: Zero-trust `firestore.rules` preventing unauthorized reads/writes.

3. **Dedicated Admin Panel (`/admin/`)**
   - **Dashboard**: High-level metrics for total users, incoming messages, waitlist counts, and pending action items.
   - **Message Center**: View full message details, sender contact, date, and update status between `Open`, `Pending`, and `Resolved`.
   - **Waitlist Management**: Inspect requested handles, notes, and track invitation readiness.
   - **User Directory**: View registered accounts, UIDs, and access tiers.
   - **Security**: Restricted strictly to authorized administrators (`spgotya49@gmail.com` bootstrapped superadmin). Unauthorized users are blocked.

## Project Structure

- `index.html` — Homepage
- `about/index.html` — About INDlop
- `features/index.html` — Features & direction
- `why-indlop/index.html` — Philosophical manifesto
- `privacy/index.html` — Privacy principles
- `community/index.html` — Community overview
- `contact/index.html` — Contact form (connected to Firestore `/messages`)
- `join/index.html` — Waitlist reservation (connected to Firestore `/waitlist`)
- `faq/index.html` — Frequently asked questions
- `leadership/` — Leadership profiles
- `admin/index.html` — Administrative Console
- `src/firebase.ts` — Firebase SDK initialization, helpers, and error handlers
- `src/indlop-firebase.ts` — Frontend client bridge for auth modals & form handling
- `src/admin/AdminApp.tsx` — Administrative Console React application
- `firestore.rules` — Production-grade security rules
- `firebase-blueprint.json` — Intermediate representation of data models and paths
- `firebase-applet-config.json` — Firebase connection credentials
- `style.css`, `pages.css` — Editorial monochrome design system
- `script.js` — Client motion, navigation, and Firebase client initialization

## How to Run Locally

1. Install dependencies:
   ```sh
   npm install
   ```

2. Start the development server:
   ```sh
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. Access the Admin Panel:
   - Navigate to `http://localhost:3000/admin/`
   - Sign in with the authorized administrator email (`spgotya49@gmail.com`) via Google or Admin login.

4. Build for production:
   ```sh
   npm run build
   ```
