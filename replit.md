# TradeLine 24/7

## Overview

TradeLine 24/7 is an AI-powered receptionist service that handles customer calls, bookings, and follow-ups in multiple languages. The application provides a web-based dashboard for managing business communications, with features including call handling, messaging, calendar management, contacts, and media management. The system is designed as a Progressive Web App (PWA) with offline capabilities and mobile installation support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript/JSX hybrid approach
- **Build Tool**: Vite for development and production builds
- **Styling**: Tailwind CSS with custom brand fonts and theming
- **PWA Support**: Service worker implementation for offline functionality and app installation
- **Component Structure**: Modular component architecture with reusable UI components and custom hooks

### Backend Architecture
- **Server**: Express.js with security middleware (Helmet, compression, rate limiting)
- **Runtime**: Node.js with ES modules
- **Voice Processing**: Twilio integration for voice services with multi-language support
- **AI Integration**: OpenAI API for intelligent conversation handling
- **Email Services**: Resend for transactional email capabilities

### Data Storage Solutions
- **Primary Database**: Supabase (PostgreSQL) for user data, organizations, and hotline configurations
- **Schema Design**: Includes tables for organizations, hotline numbers with greeting templates, and voice locale configurations
- **Authentication**: Supabase Auth for user management and session handling

### Security and Performance
- **Rate Limiting**: Express rate limiting to prevent abuse
- **Security Headers**: Helmet.js for security best practices
- **Validation**: Zod for runtime type checking and data validation
- **Secure Comparisons**: tsscmp for timing-safe string comparisons

### Multi-language Support
- **Voice Localization**: Configurable voice settings per locale with fallback mechanisms
- **Supported Locales**: English (CA/US), French (CA), Chinese (CN), Filipino (PH), Hindi (IN), Vietnamese (VN), Ukrainian (UA)
- **Dynamic Configuration**: Environment variable overrides for voice settings per locale

## External Dependencies

### Core Services
- **Supabase**: Primary database and authentication provider
- **Twilio**: Voice communication and phone number management
- **OpenAI**: AI-powered conversation handling and natural language processing
- **Resend**: Email delivery service for notifications and communications

### Development and Deployment
- **Vite**: Development server and build tool
- **Node.js**: Server runtime environment (version 20.19.3+)
- **Express.js**: Web application framework

### Security and Utilities
- **Helmet**: Security middleware for Express
- **Express Rate Limit**: API rate limiting
- **Zod**: Schema validation and type safety
- **node-fetch**: HTTP client for external API calls

The application is configured for deployment on Replit and Render with proper host allowlisting and HTTPS proxy support.