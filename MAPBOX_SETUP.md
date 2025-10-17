# Mapbox Setup Instructions

## 1. Get a Mapbox Access Token

1. Go to [Mapbox](https://www.mapbox.com/) and create a free account
2. Navigate to your [Account page](https://account.mapbox.com/)
3. Go to the "Access tokens" section
4. Copy your default public token or create a new one

## 2. Add the Token to Your Environment

Create a `.env` file in your `src/FE/` directory and add:

```bash
REACT_APP_MAPBOX_ACCESS_TOKEN=your_actual_mapbox_token_here
```

Replace `your_actual_mapbox_token_here` with your actual Mapbox access token.

## 3. Restart Your Development Server

After adding the environment variable, restart your React development server:

```bash
npm start
```

## Technology Used

✅ **Using `mapbox-gl` directly** (NOT `react-map-gl`)

- More reliable and fewer dependency issues
- Direct access to all Mapbox GL JS features
- Better performance and stability
- No import/export issues with wrapper libraries

## Features Maintained from Leaflet Version

✅ **All original functionalities preserved:**

- Heatmap visualization for unhealthy panels
- Temperature delta and peak temperature modes
- Multiple color palettes (thermal, plasma, viridis, etc.)
- Individual panel markers with click and double-click interactions
- Heat map controls panel
- Satellite imagery background
- Zoom and pan functionality
- Map indicators and stats

## Key Improvements with Mapbox

- **Better Performance**: Native WebGL rendering
- **Smoother Interactions**: Hardware-accelerated rendering
- **Better Heatmaps**: Native heatmap layer support
- **Modern Styling**: More control over map appearance
- **No Moving Points Bug**: Proper coordinate system handling
- **Built-in Navigation**: Zoom and pan controls included
- **No Dependency Issues**: Direct mapbox-gl usage

## Map Styles Available

You can change the map style by modifying the `style` property in the mapboxgl.Map constructor:

- `mapbox://styles/mapbox/satellite-streets-v12` (Current - Satellite with labels)
- `mapbox://styles/mapbox/satellite-v9` (Pure satellite)
- `mapbox://styles/mapbox/streets-v12` (Street map)
- `mapbox://styles/mapbox/outdoors-v12` (Outdoor/terrain)
- `mapbox://styles/mapbox/light-v11` (Light theme)
- `mapbox://styles/mapbox/dark-v11` (Dark theme)

## Troubleshooting

If you see a blank map:

1. Check that your Mapbox token is correctly set in the `.env` file
2. Make sure you've restarted your development server
3. Check the browser console for any error messages
4. Verify your token has the necessary permissions (default public tokens work fine)

## Dependencies

You only need:

- ✅ `mapbox-gl` (already installed in your project)
- ❌ `react-map-gl` (NOT needed - can cause import issues)
