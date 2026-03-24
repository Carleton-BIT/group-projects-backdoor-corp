# StudentHub

A modern student dashboard for Carleton University students, designed to help organize academic life in one unified platform.

## Team - Backdoor Co. (Group 1)

- Hamza Arab
- Ismail Farah
- Abdelasim Aly
- Raymond Xiao
- Adam Hariri
- Marius Triboi
- Devon Clermont-Gauer

**Live Demo:** https://carleton-bit.github.io/group-projects-backdoor-corp/

## Features

### Implemented
- **Landing Page** - Beautiful home page with Carleton University branding, hero section, feature overview, and responsive design
- **Dashboard** - Centralized view showing course schedule, upcoming deadlines, and today's classes
- **Syllabus Management** - Add and manage course syllabi
- **User Authentication** - Secure login with email/password and Google sign-in via Firebase

### Planned
- **Calendar & Deadlines** - Sync schedules with smart reminders
- **Task Management** - Track assignments with progress and priority levels
- **Smart Notifications** - Personalized alerts for deadlines and announcements

## Tech Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Icons**: Lucide React
- **Styling**: CSS Variables + Modern CSS

## Installation

```bash
# Clone the repository
git clone https://github.com/Carleton-BIT/group-projects-backdoor-corp.git

# Navigate to project directory
cd group-projects-backdoor-corp

# Install dependencies
npm install

# Create environment file for Firebase
cp .env.example .env.local
# Add your Firebase config to .env.local

# Start development server
npm run dev
```

## Environment Setup

Create a `.env.local` file in the root directory with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Optional but recommended on public deployments
VITE_FIREBASE_APPCHECK_SITE_KEY=your_recaptcha_v3_site_key

# Optional for local App Check debugging only
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=your_debug_token
```

If you want AI-based syllabus parsing, you can also set:

```env
VITE_SYLLABUS_API_URL=https://your-worker.your-subdomain.workers.dev
```

Important: do not put an OpenRouter API key in any `VITE_...` variable. Vite embeds those into the frontend bundle, which means anyone can view them in a GitHub Pages deployment.

Firebase note: the Firebase web `apiKey` is not a secret by itself. Hiding it from the repo is still useful for repo hygiene, but the real protection should come from:

1. Firebase Authentication authorized domains
2. Firestore security rules
3. Firebase App Check for browser requests

## Secure OpenRouter Setup For GitHub Pages

GitHub Pages is a static host, so it cannot safely keep your OpenRouter key secret by itself. The secure pattern is:

1. Keep this React app on GitHub Pages.
2. Deploy a tiny proxy endpoint elsewhere, such as Cloudflare Workers.
3. Store the OpenRouter key as a server-side secret in that proxy.
4. Point `VITE_SYLLABUS_API_URL` at the proxy URL.

This repo includes a Cloudflare Worker example at `openrouter-proxy/worker.mjs`.

Example Cloudflare setup:

```bash
npm install -g wrangler
wrangler login
wrangler secret put OPENROUTER_API_KEY
wrangler secret put PUBLIC_APP_URL
wrangler deploy openrouter-proxy/worker.mjs
```

Then set:

```env
VITE_SYLLABUS_API_URL=https://your-worker-url.workers.dev
```

The app will try the remote parser first and automatically fall back to the existing local PDF parser if the proxy is missing or unavailable.

## GitHub Pages Deployment Setup

This project deploys from GitHub Actions. To make Firebase work on GitHub Pages:

1. Add these repository secrets in GitHub:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
   - `VITE_FIREBASE_APPCHECK_SITE_KEY` (recommended)
2. In Firebase Authentication, add your deployed domain to Authorized domains.
   - For this repo, that is `carleton-bit.github.io`
3. In Firebase Authentication, make sure Google is enabled as a sign-in provider.
4. In Firebase App Check, register the web app and create a reCAPTCHA v3 site key if you want abuse protection on the public deployment.

If Google sign-in fails on GitHub Pages with an unauthorized-domain error, it is almost always because step 2 is missing.

## Available Scripts

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Project Structure

```
src/
├── pages/
│   ├── Home.tsx          # Landing page
│   ├── Home.css          # Landing page styles
│   ├── Dashboard.tsx     # Dashboard page
│   ├── Dashboard.css     # Dashboard styles
│   ├── Login.tsx         # Login page with Firebase Auth
│   ├── Login.css         # Login page styles
│   └── SyllabusPage.tsx  # Syllabus management
├── firebase.ts           # Firebase configuration
├── App.tsx               # Main app component with routing
├── App.css               # Global app styles
├── main.tsx              # App entry point
└── index.css             # Global styles
```

## Design System

### Colors

- **Primary Red**: `#E31C3D` (Carleton University Red)
- **Background**: `#09090B` (Dark theme)
- **Surface**: `#111113`, `#18181B`, `#27272A`
- **Text**: `#FAFAFA`, `#A1A1AA`, `#71717A`

### Typography

- Font Family: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Responsive sizing with `clamp()`

## Responsive Design

- **Desktop**: Full layout with navigation
- **Tablet**: Adaptive grid layouts
- **Mobile**: Hamburger menu, single column layout

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments

- Carleton University for inspiration

## Screenshots

![Dashboard Screenshot](./CUHUB%20Dashboard%20Screenshot.jpeg)

---

Built for Carleton University Students
