# JalDrishti Reference Guide

This folder contains all the archived code for non-live-map features, organized by module for reference and documentation purposes.

> **Note**: The live map feature (Dashboard + MapboxView) remains active in the `src` directory.

## Folder Structure

- **frontend_pages/** - All archived Next.js page components and layouts
  - `analytics/` - Spatial risk analytics page
  - `admin/` - Command center dashboard
  - `simulation/` - AI prediction simulator
  - `reports/` - Incident reporting page
  - `methodology/` - Scientific framework documentation
  - `marketing/` - Landing page components
  
- **frontend_components/** - Archived reusable React components
  - `analytics/` - FactorMap component
  - `dashboard/` - RainfallSlider, Sidebar components
  - `landing/` - Hero, Features, Stats components
  - `ui/` - Button component
  
- **frontend_context/** - React Context for state management
  - `IncidentContext.tsx` - Global incident management
  
- **frontend_api/** - Next.js API routes
  - `dashboard/` - Dashboard API route
  
- **backend_services/** - Python FastAPI backend services
  - Core server files (server.py, database.py, etc.)
  - `data/` - CSV data files
  - `tests/` - Backend test files

## Key Pages

### Marketing (Landing Page)
- [Hero.tsx](#) - Landing page hero section
- [Stats.tsx](#) - Statistics section
- [Features.tsx](#) - Features showcase

### Dashboard
- Main visualization with Mapbox map integration
- Rainfall intensity slider controls
- Incident context integration

### Analytics
- Spatial risk analytics with factor visualization
- Multiple parameter layers (WSI, Population, Roads, etc.)
- Interactive factor selection

### Admin Dashboard
- Live incident management
- Resource allocation tracking
- Emergency broadcast system
- Team dispatch management

### Reports
- Incident reporting form
- Geolocation detection
- Video upload capability
- Ward/location submission

### Simulation
- Weather model simulation
- Rainfall prediction API integration
- Urban factor regression analysis
- Ward risk assessment

### Methodology
- Scientific framework documentation
- Spatial regression model explanation
- Data source integration overview

## Backend Services

### API Endpoints
- `GET /` - Health check
- `POST /predict` - Rainfall prediction with location-wise risk assessment
- `GET/POST /api/dashboard` - Dashboard data and incident management

### Core Features
- **Rainfall Prediction Model** - PyTorch neural network
- **Location Risk Assessment** - Spatial regression with database lookup
- **Ward Risk Aggregation** - Statistical risk calculation per ward
- **API Security** - X-API-Key authentication

## Database

- **Wards** - Ward data with population information
- **Locations** - Specific location coordinates with risk factors
- **SimulationParams** - Dynamic model parameters

## Key Components

- MapboxView - Interactive map visualization
- RainfallSlider - Control panel for simulation
- FactorMap - Parameter layer viewer
- Sidebar - Navigation component
- Button - Reusable button component

## Context & State Management

- **IncidentContext** - Global incident management
- **Dashboard API** - Server-side incident data persistence
- Real-time polling (10 second interval)

---

For specific file implementations, see the corresponding subdirectories.
