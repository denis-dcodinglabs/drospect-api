#!/usr/bin/env python3
"""
FastAPI Tiling Server for COG Orthomosaic Images
Based on WebODM's tiling implementation
"""

import logging
import os
import json
from typing import Optional, Dict, Any, List
from pathlib import Path

import httpx
import numpy as np
from fastapi import FastAPI, HTTPException, Query, Path as PathParam, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

from rio_tiler.io import COGReader
from rio_tiler.errors import TileOutsideBounds, InvalidColorMapName
from rio_tiler.models import ImageData
from rio_tiler.profiles import img_profiles
from rio_tiler.colormap import cmap as colormap
import mercantile
from cachetools import TTLCache
import rasterio
from rasterio.crs import CRS
from rasterio.warp import transform_bounds

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Solar Panel Tiling Server",
    description="High-performance tile server for COG orthomosaic images",
    version="1.0.0"
)

# Import configuration
from config import get_settings

# Get settings
settings = get_settings()

# CORS configuration (allow only the two origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://drospect.ai", "https://dev.drospect.ai"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Cache for task metadata (keep to avoid many /info calls)
task_cache = TTLCache(maxsize=settings.cache_max_size, ttl=settings.cache_ttl)

# Simple mapping for backend selection also add the localhost:8000 for local development
DOMAIN_TO_BACKEND = {
    "drospect.ai": "https://drospect.ai",
    "dev.drospect.ai": "https://dev.drospect.ai",
    "localhost:8000": "http://localhost:8000",
}
DEFAULT_BACKEND = "https://drospect.ai"

# Cache for task metadata (keep to avoid many /info calls)
task_cache = TTLCache(maxsize=settings.cache_max_size, ttl=settings.cache_ttl)

# Pydantic models
class TaskMetadata(BaseModel):
    id: str
    projectId: int
    cogUrl: Optional[str] = None
    tileServiceUrl: Optional[str] = None
    bounds: Optional[List[float]] = None  # [minLng, minLat, maxLng, maxLat]
    maxZoom: Optional[int] = None
    minZoom: Optional[int] = None
    status: str

class TileJsonResponse(BaseModel):
    tilejson: str = "2.1.0"
    name: str
    version: str = "1.0.0"
    scheme: str = "xyz"
    tiles: List[str]
    minzoom: int
    maxzoom: int
    bounds: List[float]

class BoundsResponse(BaseModel):
    url: str
    bounds: List[float]

class MetadataResponse(BaseModel):
    bounds: List[float]
    minzoom: int
    maxzoom: int
    name: str
    dtype: str
    colorinterp: List[str]
    nodata: Optional[float] = None
    statistics: Dict[str, Any]
    
def resolve_backend_base_url(request: Optional[Request]) -> str:
    """
    Minimal selection:
      - Take Origin host, else Referer host.
      - Map host to backend.
      - Default to prod.
    """
    print(f"Request headers: {request.headers}")
    print(f"Request referer: {request.headers.get('referer')}")
    try:
        if request is None:
            return DEFAULT_BACKEND
        # get origin from request.headers.host
        h = request.headers.get("origin") or request.headers.get("referer") or request.headers.get("host") or ""
        return DOMAIN_TO_BACKEND.get(h, DEFAULT_BACKEND)
    except Exception:
        return DEFAULT_BACKEND

# Utility functions
async def get_task_metadata(task_id: str, backend_base_url: Optional[str] = None) -> TaskMetadata:
    """Fetch task metadata from backend API with caching"""
    if task_id in task_cache:
        return task_cache[task_id]
    backend_base_url_api = backend_base_url or settings.backend_base_url
    print(f"Backend base URL API: {backend_base_url_api}")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(    
                f"{backend_base_url_api}/api/tiles/{task_id}/info",
                timeout=settings.metadata_timeout,
            )
            response.raise_for_status()
            data = response.json()
            
            task_metadata = TaskMetadata(**data)
            task_cache[task_id] = task_metadata
            return task_metadata
            
    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch task metadata for {task_id}: {e.response.text}")
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    except Exception as e:
        logger.error(f"Unexpected error fetching task {task_id}: {e.response.text}")
        raise HTTPException(status_code=500, detail="Internal server error")

def get_zoom_safe(src_dst) -> tuple[int, int]:
    """Get safe zoom levels - fixed range from 8 to 50"""
    # Always return fixed zoom range regardless of COG spatial info
    return 8, 50

def get_tile_url(task_id: str, query_params: dict) -> str:
    """Generate tile URL template"""
    base_url = f"/api/tiles/{task_id}/{{z}}/{{x}}/{{y}}"
    
    # Add query parameters if present
    params = {}
    for k in ['format', 'rescale', 'color_map', 'size']:
        if query_params.get(k):
            params[k] = query_params.get(k)
    
    if params:
        from urllib.parse import urlencode
        base_url += '?' + urlencode(params)
    
    return base_url

async def get_cog_reader(cog_url: str, task_id: str) -> COGReader:
    """Open a Cloud-Optimised GeoTIFF by always downloading locally to avoid VSICURL issues."""
    import tempfile
    # Download the COG locally if not already present
    tmp_dir = tempfile.gettempdir()
    local_path = os.path.join(tmp_dir, f"{task_id}.tif")
    if not os.path.exists(local_path):
        try:
            with httpx.stream("GET", cog_url, timeout=httpx.Timeout(300.0, connect=60.0, read=300.0)) as response:
                response.raise_for_status()
                with open(local_path, "wb") as f:
                    for chunk in response.iter_bytes():
                        f.write(chunk)
            logger.info(f"Downloaded COG to {local_path}")
        except Exception as download_err:
            logger.error(f"Failed downloading COG {task_id}: {download_err}")
            raise HTTPException(status_code=500, detail="Failed to download COG file")
    try:
        return COGReader(local_path)
    except Exception as open_err:
        logger.error(f"Failed to open local COG {task_id}: {open_err}")
        raise HTTPException(status_code=500, detail="Failed to read COG file")

# API Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "tiling-server"}

@app.get("/api/tiles/{task_id}/tilejson", response_model=TileJsonResponse)
async def get_tile_json(
    task_id: str = PathParam(..., description="Task ID"),
    request: Request = None,
    backend_base_url: Optional[str] = None
):
    """Get TileJSON for the specified task"""
    try:
        task_metadata = await get_task_metadata(task_id, backend_base_url)
        
        # Always read from COG to compute accurate geographic bounds (EPSG:4326)
        if not task_metadata.cogUrl:
            raise HTTPException(status_code=404, detail="COG not available for this task")
        src = await get_cog_reader(task_metadata.cogUrl, task_id)
        # Compute zoom levels from metadata or database
        if task_metadata.minZoom is not None and task_metadata.maxZoom is not None:
            minzoom, maxzoom = task_metadata.minZoom, task_metadata.maxZoom
        else:
            minzoom, maxzoom = get_zoom_safe(src)
        # Transform bounds from source CRS to WGS84
        minx, miny, maxx, maxy = src.dataset.bounds
        west, south, east, north = transform_bounds(
            src.dataset.crs, "EPSG:4326", minx, miny, maxx, maxy
        )
        bounds_ll = [west, south, east, north]
        # Build query parameters from request
        query_params = dict(request.query_params) if request else {}
        return TileJsonResponse(
            name=f"Task {task_id} Orthomosaic",
            tiles=[get_tile_url(task_id, query_params)],
            minzoom=minzoom - settings.zoom_extra_levels,
            maxzoom=maxzoom + settings.zoom_extra_levels,
            bounds=bounds_ll
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating TileJSON for task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate TileJSON")

@app.get("/api/tiles/{task_id}/bounds", response_model=BoundsResponse)
async def get_bounds(
    task_id: str = PathParam(..., description="Task ID"),
    request: Request = None,
    backend_base_url: Optional[str] = None
):
    """Get bounds for the specified task"""
    try:
        task_metadata = await get_task_metadata(task_id, backend_base_url)
        if not task_metadata.cogUrl:
            raise HTTPException(status_code=404, detail="COG not available for this task")
        # Compute geographic bounds from COG
        src = await get_cog_reader(task_metadata.cogUrl, task_id)
        minx, miny, maxx, maxy = src.dataset.bounds
        west, south, east, north = transform_bounds(
            src.dataset.crs, "EPSG:4326", minx, miny, maxx, maxy
        )
        bounds_ll = [west, south, east, north]
        query_params = dict(request.query_params) if request else {}
        return BoundsResponse(
            url=get_tile_url(task_id, query_params),
            bounds=bounds_ll
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bounds for task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bounds")

@app.get("/api/tiles/{task_id}/metadata")
async def get_metadata(
    task_id: str = PathParam(..., description="Task ID"),
    backend_base_url: Optional[str] = None
):
    """Get metadata for the specified task"""
    try:
        task_metadata = await get_task_metadata(task_id, backend_base_url)
        
        if not task_metadata.cogUrl:
            raise HTTPException(status_code=404, detail="COG not available for this task")
        
        src = await get_cog_reader(task_metadata.cogUrl, task_id)
        meta = src.info()
        minzoom, maxzoom = get_zoom_safe(src)
        
        # Get color interpretation
        colorinterp = [ci.name for ci in src.dataset.colorinterp]
        
        # Get statistics if available
        try:
            stats = src.statistics()
            statistics = {
                str(i+1): {
                    'min': float(band_stats.min),
                    'max': float(band_stats.max),
                    'mean': float(band_stats.mean),
                    'count': int(band_stats.count),
                    'sum': float(band_stats.sum),
                    'std': float(band_stats.std),
                    'median': float(band_stats.median),
                    'majority': float(band_stats.majority),
                    'minority': float(band_stats.minority),
                    'unique': int(band_stats.unique),
                    'histogram': band_stats.histogram,
                    'valid_percent': float(band_stats.valid_percent),
                    'masked_percent': float(band_stats.masked_percent),
                    'percentile_2': float(band_stats.percentile_2),
                    'percentile_98': float(band_stats.percentile_98)
                } for i, band_stats in enumerate(stats)
            }
        except Exception as e:
            logger.warning(f"Could not get statistics for task {task_id}: {e}")
            statistics = {}
        
        # Determine nodata value with fallback to dataset if missing
        nodata_value = getattr(meta, "nodata", src.dataset.nodata)
        
        return MetadataResponse(
            bounds=task_metadata.bounds or meta.bounds,
            minzoom=minzoom - settings.zoom_extra_levels,
            maxzoom=maxzoom + settings.zoom_extra_levels,
            name=f"Task {task_id} Orthomosaic",
            dtype=str(meta.dtype),
            colorinterp=colorinterp,
            nodata=nodata_value,
            statistics=statistics
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting metadata for task {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to get metadata")

@app.get("/api/tiles/{task_id}/{z}/{x}/{y}.png")
async def get_tile_png(
    task_id: str = PathParam(..., description="Task ID"),
    z: int = PathParam(..., description="Zoom level"),
    x: int = PathParam(..., description="Tile X coordinate"),
    y: int = PathParam(..., description="Tile Y coordinate"),
    size: int = Query(default=settings.default_tile_size, description="Tile size"),
    rescale: Optional[str] = Query(default=None, description="Rescale values (min,max)"),
    color_map: Optional[str] = Query(default=None, description="Color map name"),
    nodata: Optional[str] = Query(default=None, description="Nodata value"),
    return_mask: bool = Query(default=False, description="Return mask"),
    request: Request = None,
    backend_base_url: Optional[str] = None,
):
    """PNG tile endpoint so that the .png suffix is captured before the generic one."""

    return await get_tile(
        task_id=task_id,
        z=z,
        x=x,
        y=y,
        format="png",
        size=size,
        rescale=rescale,
        color_map=color_map,
        nodata=nodata,
        return_mask=return_mask,
        request=request,
        backend_base_url=backend_base_url,
    )

@app.get("/api/tiles/{task_id}/{z}/{x}/{y}")
async def get_tile_default(
    task_id: str = PathParam(..., description="Task ID"),
    z: int = PathParam(..., description="Zoom level"),
    x: int = PathParam(..., description="Tile X coordinate"),
    y: int = PathParam(..., description="Tile Y coordinate"),
    size: int = Query(default=settings.default_tile_size, description="Tile size"),
    rescale: Optional[str] = Query(default=None, description="Rescale values (min,max)"),
    color_map: Optional[str] = Query(default=None, description="Color map name"),
    nodata: Optional[str] = Query(default=None, description="Nodata value"),
    return_mask: bool = Query(default=False, description="Return mask"),
    request: Request = None,
    backend_base_url: Optional[str] = None,
):
    """Fallback PNG tile endpoint without format suffix"""
    return await get_tile(
        task_id=task_id,
        z=z,
        x=x,
        y=y,
        format="png",
        size=size,
        rescale=rescale,
        color_map=color_map,
        nodata=nodata,
        return_mask=return_mask,
        request=request,
        backend_base_url=backend_base_url,
    )

@app.get("/api/tiles/{task_id}/{z}/{x}/{y}.{format}")
async def get_tile(
    task_id: str = PathParam(..., description="Task ID"),
    z: int = PathParam(..., description="Zoom level"),
    x: int = PathParam(..., description="Tile X coordinate"),
    y: int = PathParam(..., description="Tile Y coordinate"),
    format: str = PathParam(..., description="Output format"),
    size: int = Query(default=settings.default_tile_size, description="Tile size"),
    rescale: Optional[str] = Query(default=None, description="Rescale values (min,max)"),
    color_map: Optional[str] = Query(default=None, description="Color map name"),
    nodata: Optional[str] = Query(default=None, description="Nodata value"),
    return_mask: bool = Query(default=False, description="Return mask"),
    request: Request = None,
    backend_base_url: Optional[str] = None
):
    """Get a tile image for the specified task"""
    try:
        task_metadata = await get_task_metadata(task_id, backend_base_url)
        
        if not task_metadata.cogUrl:
            raise HTTPException(status_code=404, detail="COG not available for this task")
        
        # Validate tile size
        if size not in [256, 512]:
            raise HTTPException(status_code=400, detail="Tile size must be 256 or 512")
        
        # Adjust zoom level for 512px tiles
        if size == 512:
            z -= 1
        
        # Validate format
        if format not in ["png", "jpg", "jpeg", "webp", "tif", "tiff"]:
            raise HTTPException(status_code=400, detail="Invalid format")
        
        # Process rescale parameter
        rescale_arr = None
        if rescale:
            try:
                rescale_arr = list(map(float, rescale.split(",")))
                if len(rescale_arr) != 2:
                    raise ValueError("Rescale must have exactly 2 values")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid rescale format (should be 'min,max')")
        
        # Process nodata parameter
        nodata_value = None
        if nodata:
            try:
                nodata_value = np.nan if nodata.lower() == "nan" else float(nodata)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid nodata value")
        
        # Validate color map
        if color_map:
            try:
                colormap.get(color_map)
            except InvalidColorMapName:
                raise HTTPException(status_code=400, detail="Invalid color map")
        
        # Read tile from COG
        src = await get_cog_reader(task_metadata.cogUrl, task_id)
        # Check if tile exists (x, y, z)
        if not src.tile_exists(x, y, z):
            raise HTTPException(status_code=404, detail="Tile outside bounds")
        
        # Get zoom limits
        minzoom, maxzoom = get_zoom_safe(src)
        if z < minzoom - settings.zoom_extra_levels or z > maxzoom + settings.zoom_extra_levels:
            raise HTTPException(status_code=404, detail="Zoom level outside bounds")
        
        try:
            # Generate tile
            tile = src.tile(
                x, y, z,
                tilesize=size,
                nodata=nodata_value,
                resampling_method="nearest"
            )
            
            # Apply rescaling if specified
            if rescale_arr:
                tile = tile.post_process(
                    rescale=rescale_arr
                )
            
            # Apply color map if specified
            if color_map:
                tile = tile.post_process(
                    color_map=colormap.get(color_map)
                )
            
            # Determine output format
            if format in ["jpg", "jpeg"]:
                driver = "JPEG"
                media_type = "image/jpeg"
            elif format == "webp":
                driver = "WEBP"
                media_type = "image/webp"
            elif format in ["tif", "tiff"]:
                driver = "GTiff"
                media_type = "image/tiff"
            else:  # png
                driver = "PNG"
                media_type = "image/png"
            
            # Auto-detect format based on transparency if not specified
            if format == "png" and request and 'image/webp' in request.headers.get('Accept', ''):
                # Check if tile has transparency
                if not np.equal(tile.mask, 255).all():
                    driver = "WEBP"
                    media_type = "image/webp"
            
            # Get profile options
            options = img_profiles.get(driver.lower(), {})
            
            # Render tile to bytes
            tile_bytes = tile.render(
                img_format=driver,
                **options
            )
            
            return Response(
                content=tile_bytes,
                media_type=media_type,
                headers={
                    "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
                    "Access-Control-Allow-Origin": "*",
                }
            )
            
        except TileOutsideBounds:
            raise HTTPException(status_code=404, detail="Tile outside bounds")
        except ValueError as ve:
            # rio-tiler may raise ValueError("cannot convert float infinity to integer")
            logger.warning(f"ValueError while generating tile for task {task_id}: {ve}")
            raise HTTPException(status_code=404, detail="Tile outside bounds")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating tile for task {task_id} at {z}/{x}/{y}: {e}")
        raise HTTPException(status_code=500, detail="Failed to render tile")

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "Solar Panel Tiling Server",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "tilejson": "/api/tiles/{task_id}/tilejson",
            "bounds": "/api/tiles/{task_id}/bounds",
            "metadata": "/api/tiles/{task_id}/metadata",
            "tiles": "/api/tiles/{task_id}/{z}/{x}/{y}[.format]"
        }
    }

if __name__ == "__main__":
    # Development server
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level=settings.log_level.lower()
    ) 