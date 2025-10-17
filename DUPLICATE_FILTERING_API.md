# Solar Panel Duplicate Image Filtering API

This API helps filter duplicate images of the same solar panels taken from different angles during drone flights.

## Overview

When drones take photos every 2-3 seconds at different altitudes (17-20m for low, 30-40m for high), you often get 4-5 photos of the same defective panel from different angles. This API automatically detects and filters these duplicates based on:

- **GPS proximity** (default: 15 meter radius)
- **Time window** (default: 30 seconds)
- **Image characteristics** (prioritizes unhealthy/inspected images)

## API Endpoints

### 1. Analyze Duplicates (Preview)

`POST /projects/images/duplicates/analyze`

Analyzes images and returns duplicate groups without making any changes.

**Request Body:**

```json
{
  "projectId": 123,
  "radiusMeters": 5, // Optional: GPS radius for grouping (default: 5)
  "timeWindowSeconds": 10, // Optional: time window for grouping (default: 10)
  "onlyUnhealthy": true // Optional: only process unhealthy panels (default: true)
}
```

**Response:**

```json
{
  "status": "Ok!",
  "data": {
    "filteredImages": [...],     // Images after removing duplicates
    "duplicateGroups": [         // Groups of duplicate images found
      {
        "representativeImage": {...},  // Best image to keep
        "duplicates": [...],           // All images in this group
        "groupCenter": {               // Average GPS location
          "latitude": 40.123,
          "longitude": -74.456
        },
        "groupSize": 4
      }
    ],
    "stats": {
      "totalImages": 100,
      "duplicatesRemoved": 25,
      "groupsFound": 8
    }
  }
}
```

### 2. Apply Duplicate Filter

`POST /projects/images/duplicates/filter`

Actually filters duplicates by marking them as deleted (keeps the best representative image from each group).

**Request Body:** Same as analyze endpoint

**Response:**

```json
{
  "status": "Ok!",
  "data": {
    "message": "Successfully filtered 25 duplicate images from 8 groups",
    "stats": {
      "totalImages": 100,
      "duplicatesMarkedDeleted": 25,
      "groupsProcessed": 8
    }
  }
}
```

### 3. Process with Automatic Filtering

`POST /image-processing/process-complete`

Enhanced image processing workflow with optional duplicate filtering.

**Request Body:**

```json
{
  "id": 123,
  "projectName": "Solar Farm A",
  "numberOfFiles": 100,
  "altitude": "LOW",
  "drone": {...},
  "filterDuplicates": true,     // Enable duplicate filtering
  "radiusMeters": 5,           // Optional
  "timeWindowSeconds": 10      // Optional
}
```

## How It Works

1. **GPS Clustering**: Images taken within the specified radius (default 5m) are grouped together
2. **Time Window**: Only images taken within the time window (default 10s) are considered duplicates
3. **Best Image Selection**: From each duplicate group, keeps the best image based on:
   - Prioritizes inspected images over uninspected
   - Prioritizes unhealthy panels over healthy ones
   - Falls back to alphabetical filename ordering
4. **Soft Delete**: Duplicate images are marked as `isDeleted: true` rather than permanently deleted

## Usage Examples

### Basic Usage - Analyze First

```bash
# 1. First analyze to see what would be filtered
curl -X POST /projects/images/duplicates/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"projectId": 123}'

# 2. If results look good, apply the filter
curl -X POST /projects/images/duplicates/filter \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"projectId": 123}'
```

### Custom Parameters

```bash
# More aggressive filtering - larger radius, longer time window
curl -X POST /projects/images/duplicates/filter \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "projectId": 123,
    "radiusMeters": 10,
    "timeWindowSeconds": 20,
    "onlyUnhealthy": false
  }'
```

### Automatic Processing with Filtering

```bash
# Process images with automatic duplicate filtering
curl -X POST /image-processing/process-complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id": 123,
    "projectName": "Solar Farm A",
    "numberOfFiles": 100,
    "altitude": "LOW",
    "filterDuplicates": true
  }'
```

## Benefits

- **Reduces processing costs**: Fewer images sent to cloud AI = lower credit usage
- **Improves accuracy**: Eliminates redundant analysis of the same defects
- **Saves storage**: Reduces database clutter from duplicate images
- **Faster analysis**: Less data to process means faster results

## Frontend Caching

The frontend implements smart caching for duplicate filter results to improve user experience:

### Features

- **30-minute cache duration**: Results are cached for 30 minutes by default
- **Automatic cache invalidation**: Cache is cleared when new image processing starts
- **Manual refresh**: Users can manually refresh cache using the 🔄 button
- **Cache status indicator**: UI shows ⚡ "From Cache" when displaying cached results
- **Per-project caching**: Each project has its own cache to avoid conflicts

### Implementation

- Uses `localStorage` to persist cache between browser sessions
- Cache key format: `duplicate_filter_{projectId}`
- Includes expiry timestamp to handle automatic cleanup
- Applies search and category filters to cached data without API calls

### Cache Management

- Cache is automatically cleared when:
  - Processing new images
  - Cache expires (30 minutes)
  - User manually clicks refresh button
  - Browser storage is cleared

### Performance Benefits

- First load: ~10 seconds (API call)
- Subsequent toggles: ~100ms (from cache)
- Reduces server load and improves responsiveness

## Notes

- Images without GPS coordinates are ignored during filtering
- The API preserves the best quality/most relevant image from each duplicate group
- Filtered images are soft-deleted (marked as `isDeleted: true`) and can be recovered if needed
- Works best with images that have consistent GPS metadata and filename patterns
