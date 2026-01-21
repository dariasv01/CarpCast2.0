<!-- Fishing Activity Forecast - CarpCast 2.0 -->
# CarpCast 2.0 - Global Fishing Activity Forecast

## Project Overview
Mobile-first web application for global fishing activity forecasting using free APIs.

### Progress Checklist:
- [x] Verify that the copilot-instructions.md file in the .github directory is created.
- [x] Clarify Project Requirements - Mobile-first fishing forecast app
- [x] Scaffold the Project - Next.js 14 + TypeScript + Tailwind CSS
- [x] Customize the Project - Implemented complete fishing forecast system
- [x] Install Required Extensions - Not needed for this project
- [x] Compile the Project - Fixed dependency issues and configuration
- [x] Create and Run Task - Development server ready
- [x] Launch the Project - Ready for deployment
- [x] Ensure Documentation is Complete - Comprehensive README and docs

## Technical Stack
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- Backend: Next.js API routes + Node.js
- Database: SQLite with Prisma ORM
- APIs: Open-Meteo, USNO, Nominatim OSM, USGS
- Mobile-first responsive design

## Key Features Implemented
✅ Global weather & marine data integration (Open-Meteo API)
✅ Astronomical data (USNO/Sunrise-Sunset APIs)
✅ Geocoding system (OpenStreetMap Nominatim)
✅ Modular hydrology system (USGS Water Services for US)
✅ Activity scoring algorithm (0-100) with explanations
✅ Location favorites system with database
✅ Weather alerts and notifications
✅ Mobile-first responsive UI
✅ Degradation for missing data sources
✅ Rate limiting and API attribution

## Core Components

### APIs & Data Sources
- Weather API client (Open-Meteo) - Global coverage
- Astronomy API client (USNO/fallbacks) - Global coverage  
- Geocoding API client (Nominatim) - Global coverage
- Hydrology API system (USGS + modular architecture)
- Activity scoring engine with explanations

### UI Components  
- Homepage with location search and mode selection
- Forecast page with hourly breakdown and charts
- Favorites management with CRUD operations
- Settings page with preferences and data sources
- Mobile-optimized components with Tailwind CSS

### Backend Systems
- RESTful API endpoints for all features
- Database models for favorites and alerts
- Caching system for API responses
- Error handling and graceful degradation

## Project Status: COMPLETE ✅
The CarpCast 2.0 application is fully implemented and ready for development/deployment. All core features are functional with proper error handling and mobile-first design.