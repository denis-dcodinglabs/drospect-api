# Python Tiling Server

A high-performance FastAPI-based tile server for serving Cloud Optimized GeoTIFF (COG) orthomosaic images. Based on WebODM's tiling implementation but optimized for our solar panel project infrastructure.

## Features

- 🚀 **High Performance**: FastAPI with uvicorn/gunicorn for production
- 🗺️ **Standard XYZ Tiles**: Compatible with Leaflet, OpenLayers, and other map libraries
- 🌐 **COG Support**: Optimized for Cloud Optimized GeoTIFF files
- 📊 **Multiple Formats**: PNG, JPEG, WebP, TIFF output formats
- 🎨 **Color Processing**: Support for color maps and rescaling
- 📋 **TileJSON**: Standard tile.json metadata format
- ⚡ **Caching**: Built-in caching for improved performance
- 🔍 **Metadata**: Comprehensive raster metadata endpoints

## API Endpoints

### Core Endpoints

| Endpoint      | Description     |
| ------------- | --------------- |
| `GET /health` | Health check    |
| `GET /`       | API information |

### Tile Endpoints

| Endpoint                                        | Description       |
| ----------------------------------------------- | ----------------- |
| `GET /api/tiles/{task_id}/tilejson`             | TileJSON metadata |
| `GET /api/tiles/{task_id}/bounds`               | Geographic bounds |
| `GET /api/tiles/{task_id}/metadata`             | Raster metadata   |
| `GET /api/tiles/{task_id}/{z}/{x}/{y}[.format]` | Individual tiles  |

### Tile Parameters

- **format**: `png`, `jpg`, `jpeg`, `webp`, `tif`, `tiff` (default: `png`)
- **size**: `256`, `512` (default: `256`)
- **rescale**: `min,max` values for pixel rescaling
- **color_map**: Color map name for visualization
- **nodata**: NoData value handling

## Installation & Setup

### Development Setup

1. **Navigate to the tiling server directory:**

   ```bash
   cd src/python-tiling-server
   ```

2. **Run the development server:**

   ```bash
   ./start-dev.sh
   ```

   This will:

   - Create a virtual environment
   - Install dependencies
   - Start the server with auto-reload

### Production Setup

1. **Set environment variables:**

   ```bash
   export BACKEND_BASE_URL=http://your-backend:3000
   export PORT=8000
   export WORKERS=4
   ```

2. **Run the production server:**
   ```bash
   ./start-prod.sh
   ```

### Docker Setup

1. **Build the Docker image:**

   ```bash
   docker build -t solar-tiling-server .
   ```

2. **Run the container:**
   ```bash
   docker run -p 8000:8000 \
     -e BACKEND_BASE_URL=http://your-backend:3000 \
     solar-tiling-server
   ```

## Configuration

The server can be configured through environment variables or by editing `config.py`:

```python
# Server Configuration
HOST=0.0.0.0
PORT=8000

# Backend API
BACKEND_BASE_URL=http://localhost:3000

# Performance
WORKERS=4
CACHE_TTL=300

# Tiles
DEFAULT_TILE_SIZE=256
ZOOM_EXTRA_LEVELS=2
```

## Usage Examples

### TileJSON for Leaflet

```javascript
// Get TileJSON metadata
const response = await fetch("/api/tiles/your-task-id/tilejson");
const tileJson = await response.json();

// Use with Leaflet
const map = L.map("map");
const tileLayer = L.tileLayer(tileJson.tiles[0], {
  minZoom: tileJson.minzoom,
  maxZoom: tileJson.maxzoom,
  bounds: tileJson.bounds,
});
map.addLayer(tileLayer);
map.fitBounds(tileJson.bounds);
```

### Direct Tile URLs

```javascript
// Standard tile URL
const tileUrl = "/api/tiles/your-task-id/{z}/{x}/{y}.png";

// With parameters
const enhancedUrl =
  "/api/tiles/your-task-id/{z}/{x}/{y}.png?rescale=0,255&size=512";
```

### Metadata API

```javascript
// Get comprehensive metadata
const metadata = await fetch("/api/tiles/your-task-id/metadata");
const info = await metadata.json();
console.log("Bounds:", info.bounds);
console.log("Zoom levels:", info.minzoom, "-", info.maxzoom);
console.log("Statistics:", info.statistics);
```

## Integration with Backend

The tiling server integrates with your NestJS backend:

1. **Task Metadata**: Fetches task information from `/api/thermal-processing/task/{id}`
2. **COG URLs**: Reads COG files from Google Cloud Storage URLs
3. **Caching**: Caches task metadata and COG readers for performance

### Required Backend Response Format

```typescript
interface TaskMetadata {
  id: string;
  projectId: number;
  cogUrl?: string;
  bounds?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  maxZoom?: number;
  minZoom?: number;
  status: string;
}
```

## Testing

Run the test suite to verify the server is working:

```bash
python test_server.py
```

This tests:

- Health endpoint
- API information
- Error handling for non-existent tasks
- Response format validation

## Performance Optimization

### Production Deployment

1. **Use Gunicorn**: Multi-worker setup for high concurrency
2. **Enable Caching**: Redis/Memcached for production caching
3. **CDN Integration**: CloudFlare or similar for tile caching
4. **Load Balancing**: Multiple server instances behind a load balancer

### Caching Strategy

- **Task Metadata**: 5-minute TTL cache
- **COG Readers**: Long-term cache with LRU eviction
- **HTTP Caching**: 1-hour cache headers for tiles

## Monitoring & Logging

### Development

- Console logging with debug level
- Access logs to stdout

### Production

- Structured JSON logging
- Separate access and error logs
- Health check endpoint for monitoring

## Troubleshooting

### Common Issues

1. **GDAL Not Found**

   ```bash
   # Install GDAL system dependencies
   sudo apt-get install gdal-bin libgdal-dev
   ```

2. **Backend Connection Issues**

   ```bash
   # Check backend URL
   curl http://localhost:3000/health
   ```

3. **COG Access Issues**
   - Verify Google Cloud Storage permissions
   - Check COG file accessibility
   - Validate COG format with `gdalinfo`

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=DEBUG
./start-dev.sh
```

## Dependencies

- **FastAPI**: Modern Python web framework
- **rio-tiler**: COG reading and tile generation
- **rasterio**: Geospatial raster I/O
- **uvicorn/gunicorn**: ASGI servers
- **httpx**: Async HTTP client
- **numpy**: Numerical operations
- **Pillow**: Image processing

## License

This project is part of the Solar Panel Web application.
