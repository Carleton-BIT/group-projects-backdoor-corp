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
```

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
