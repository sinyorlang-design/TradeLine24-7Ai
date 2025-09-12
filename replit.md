# Overview

This is a React-based voicemail application that integrates with Twilio for phone call handling, OpenAI for transcription, and Resend for email notifications. The application provides a web interface for managing voicemail settings and a backend API that handles incoming phone calls, records voicemails, transcribes them using AI, and sends email notifications with summaries.

The system is designed for multi-locale support (EU locales) and is optimized for deployment on Render with proper health check endpoints and production-ready configuration.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React 18** with Vite as the build tool for fast development and optimized production builds
- **TypeScript support** with JSX for type safety and better developer experience
- **Tailwind CSS** for utility-first styling and responsive design
- **React Router DOM** for client-side routing and navigation
- **Single Page Application (SPA)** architecture serving static assets from `/dist` in production

## Backend Architecture
- **Express.js server** (`server.mjs`) handling both API endpoints and static file serving
- **Production-ready middleware stack** including:
  - Helmet for security headers
  - Compression for response optimization
  - Rate limiting for API protection
- **Health check endpoints** (`/healthz`, `/readyz`) for deployment monitoring
- **Twilio webhook integration** at `/voice/answer` and `/voice/recording-status`
- **Background job processing** for AI transcription and email notifications

## API Structure
- **Voice endpoints** for Twilio webhook handling:
  - `POST /voice/answer` - Handles incoming calls with locale-specific greetings
  - `POST /voice/recording-status` - Processes recordings with AI transcription and email
    - Downloads audio from Twilio
    - Transcribes using OpenAI Whisper
    - Generates AI summary
    - Sends formatted email via Resend
- **Health monitoring endpoints** for deployment health checks
- **Static file serving** for the React application

## AI and Communication Services
- **OpenAI Whisper integration** for audio transcription with multi-language support
- **AI-powered summarization** using OpenAI's language models
- **Email notifications** via Resend API with structured voicemail summaries
- **Multi-locale support** for EU markets (en-GB, fr-FR, de-DE, es-ES, it-IT, nl-NL)

## Deployment Architecture
- **Vite build pipeline** creating optimized production bundles
- **Node.js production server** serving both API and static assets
- **Environment-based configuration** for different deployment stages
- **Render-optimized deployment** with proper build and start commands

# External Dependencies

## Core Services
- **Twilio** - Phone call handling and recording webhooks
  - Multi-locale voice support with Polly TTS
  - Recording callbacks for voicemail processing
- **OpenAI API** - Audio transcription (Whisper) and text summarization
  - Whisper model for accurate multi-language transcription
  - GPT-3.5-turbo for intelligent voicemail summarization
- **Resend** - Transactional email delivery for voicemail notifications
  - HTML email templates with professional formatting
  - Localized email subjects and content

## Frontend Dependencies
- **React 18** and **React DOM** for UI framework
- **React Router DOM** for client-side routing
- **Vite** for build tooling and development server
- **Tailwind CSS** for styling framework

## Backend Dependencies
- **Express.js** for web server and API endpoints
- **Node-fetch** for external API communication
- **OpenAI SDK** for Whisper transcription and GPT summarization
- **Resend SDK** for transactional email delivery
- **Compression**, **Helmet**, **Express Rate Limit** for production middleware

## Development Tools
- **TypeScript** for type checking and development experience
- **Autoprefixer** and **PostCSS** for CSS processing
- **Vite React Plugin** for React integration

## Deployment Platform
- **Render** - Primary hosting platform with auto-scaling configuration
- **npm ci** - Lockfile-based dependency installation for consistent builds
- **Health check monitoring** integrated with Render's uptime monitoring