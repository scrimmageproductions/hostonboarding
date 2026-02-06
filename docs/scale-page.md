# PizzaDAO at Scale - Global Member Visualization

## Overview
Interactive globe visualization showing the global distribution of PizzaDAO members with real-time statistics, heat maps, and regional insights.

## Features

### 1. Interactive 3D Globe
- Real-time globe visualization using `react-globe.gl`
- Auto-rotating globe with member location pins
- Pin sizes scale with number of members in each city
- Clickable pins showing member details

### 2. Heat Map Mode
Filter by turtle team/skill to see geographic distribution:
- **Splinter** (brown) - Leadership/strategy
- **Raphael** (red) - Action/execution
- **Leonardo** (blue) - Planning/coordination
- **Donatello** (purple) - Technical/research
- **April** (yellow) - Communication/outreach
- **Foot Clan** (grey) - Support roles
- **Michelangelo** (orange) - Creative/social

### 3. Statistics Dashboard
- Total members count
- Number of cities represented
- Number of countries
- Percentage of members with location data

### 4. Data Visualizations
- **Skill Distribution**: Pie chart showing turtle team breakdown
- **Top Countries**: Bar chart of member distribution by country
- **Top Cities**: Grid view of cities with most members

### 5. Pizza Toppings by Region
Analyzes favorite pizza toppings from member profiles, aggregated by region:
- Shows top 3 toppings per country
- Member count per region
- Scraped from member profile data

## Technical Implementation

### API Endpoints
- `/api/members/locations` - Fetches all member data with geocoded locations
  - Caches for 10 minutes
  - Filters out inactive members
  - Includes city coordinates from built-in database

### Data Sources
- Primary: Main crew sheet (`16BBOfasVwz8L6fPMungz_Y0EfF6Z9puskLAix3tCHzM`)
- Geocoding: Built-in city coordinates database (50+ major cities)
- Skills: Turtle team assignments from member profiles
- Pizza data: Favorite pizza field from member profiles

### Color Scheme
- Black & white theme with strategic color usage
- Turtle team colors only appear in heat map mode and charts
- Clean, modern design matching the rest of the app

### Performance
- Client-side caching of member data
- Server-side caching (10 min TTL)
- Dynamic imports for globe component (avoid SSR)
- Optimized globe rendering with Three.js

## Navigation
- Accessible from `/scale`
- Link added to Crews page navigation
- Back navigation to home and crews pages

## Future Enhancements
- Real-time updates via WebSocket
- Member clustering for dense areas
- More detailed profile popups on pin click
- Time-based animations (member growth over time)
- Export visualization as image/video
- Mobile-optimized view with touch controls
