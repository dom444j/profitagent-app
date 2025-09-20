# ProFitAgent Frontend

React frontend application for the ProFitAgent platform for AI-powered technological tool licenses.

## Features

- **User Licenses Page**: View active licenses with KPIs, progress tracking, and 20-day earning calendar
- **Real-time Updates**: Server-Sent Events (SSE) for live updates
- **Responsive Design**: Built with Tailwind CSS for mobile and desktop
- **TypeScript**: Full type safety throughout the application

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Axios** for API communication
- **React Router** for navigation
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:5000`

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/
│   └── ui/           # Reusable UI components
├── hooks/            # Custom React hooks
├── pages/            # Page components
├── services/         # API services
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── App.tsx           # Main app component
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## Key Features

### User Licenses Page (`/user/licenses`)

- **KPI Cards**: Active licenses, total invested, total earned, average progress
- **Balance Summary**: Available balance, potential on hold, pending commissions
- **License Cards**: Interactive cards showing license details and progress
- **20-Day Calendar**: Visual representation of daily earnings with status indicators

### Real-time Updates

The application connects to SSE endpoints for real-time updates:
- `earningPaid` - New daily earnings
- `licensePaused` - License pause status changes
- `licenseCompleted` - License completion notifications

### Authentication

Simple authentication system with JWT tokens stored in localStorage.

## API Integration

The frontend integrates with the following backend endpoints:

- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/balance` - User balance
- `GET /api/v1/licenses` - User licenses
- `GET /api/v1/licenses/{id}/earnings` - License earnings
- `GET /api/v1/sse/events` - SSE connection

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new code
3. Add proper error handling
4. Test your changes thoroughly

