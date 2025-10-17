# Thermal Image Processing & Orthomosaic 3D Mapping Implementation Guide

## Project Overview

This document outlines the implementation of a thermal image processing system that creates orthomosaic 3D maps using an external NodeODM API. The workflow consists of three main phases:

1. **Task Creation**: Send thermal images to NodeODM API and receive a task UUID
2. **Progress Tracking**: Monitor task progress until completion
3. **Result Processing**: Download, extract, and display the generated orthomosaic image

## Current System Analysis

### Technology Stack

- **Backend**: NestJS with TypeScript
- **Frontend**: React with Redux
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: Google Cloud Storage
- **Existing Features**: Project management, image analysis, user authentication

### External API Details

- **NodeODM API Base URL**: `https://nodeodm-api-489128681655.europe-west1.run.app`
- **Task Creation**: `POST /task/new`
- **Progress Monitoring**: `GET /task/{uuid}/info`
- **Download Results**: `GET /task/{uuid}/download/all.zip`

## Implementation Tasks

### Phase 1: Backend Infrastructure Setup

#### Task 1.1: Database Schema Updates

**Objective**: Extend the existing database schema to support thermal image processing

**Actions**:

- Add `ThermalProcessingTask` model to `prisma/schema.prisma`
- Add thermal processing fields to existing `Project` model
- Create migration files
- Update TypeScript types

**Expected Fields**:

```prisma
model ThermalProcessingTask {
  id          String   @id @default(uuid())
  projectId   Int      // Foreign key to Project
  taskUuid    String   @unique // UUID from NodeODM API
  status      String   // 'pending', 'processing', 'completed', 'failed'
  progress    Int      @default(0) // Percentage 0-100
  imagesCount Int      @default(0)
  nodeOdmOptions Json? // Options sent to NodeODM
  resultUrl   String?  // URL to processed result image
  errorMessage String? // Error details if failed
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project  @relation(fields: [projectId], references: [id])
}
```

#### Task 1.2: NodeODM Service Module

**Objective**: Create a dedicated service for NodeODM API interactions

**Actions**:

- Create `src/thermal-processing/` directory structure
- Implement `NodeOdmService` class
- Add HTTP client configuration for NodeODM API
- Implement error handling and retry logic
- Add configuration management for NodeODM URL

**Required Methods**:

- `createTask(images: File[], options: object): Promise<{uuid: string}>`
- `getTaskInfo(uuid: string): Promise<TaskInfo>`
- `downloadTaskResult(uuid: string): Promise<Buffer>`
- `isTaskCompleted(uuid: string): Promise<boolean>`

#### Task 1.3: Thermal Processing Controller

**Objective**: Create REST endpoints for thermal processing operations

**Actions**:

- Create `ThermalProcessingController` class
- Implement endpoints:
  - `POST /thermal-processing/start/:projectId` - Start processing
  - `GET /thermal-processing/status/:taskId` - Get status
  - `GET /thermal-processing/result/:taskId` - Get result
  - `POST /thermal-processing/cancel/:taskId` - Cancel task
- Add proper authentication and authorization
- Implement file upload handling with validation

#### Task 1.4: Background Job Processing

**Objective**: Implement background monitoring of NodeODM tasks

**Actions**:

- Install and configure job queue library (Bull/BullMQ)
- Create `ThermalProcessingQueue` service
- Implement periodic status checking job
- Add job for downloading and processing completed results
- Implement proper error handling and retry mechanisms
- Add job cleanup for completed/failed tasks

### Phase 2: File Management & Storage

#### Task 2.1: Enhanced File Upload System

**Objective**: Extend existing file upload to handle thermal images with metadata

**Actions**:

- Update existing file upload service to handle thermal images
- Add EXIF data extraction for thermal images
- Implement file validation (format, size, thermal metadata)
- Create thermal image preprocessing pipeline
- Add support for batch uploads

#### Task 2.2: Google Cloud Storage Integration

**Objective**: Extend existing GCS integration for thermal processing results

**Actions**:

- Create dedicated bucket/folder structure for thermal results
- Implement result image storage after processing
- Add proper file naming conventions
- Implement cleanup policies for old results
- Add CDN configuration for fast image delivery

#### Task 2.3: Zip File Processing

**Objective**: Handle NodeODM result zip files

**Actions**:

- Install unzipper dependencies (already available)
- Create `ZipProcessingService`
- Implement zip extraction and file filtering
- Add orthomosaic image identification logic
- Implement temporary file cleanup

### Phase 3: Frontend Integration

#### Task 3.1: Thermal Processing UI Components

**Objective**: Create React components for thermal processing workflow

**Actions**:

- Create `ThermalProcessing` component directory in `src/FE/src/components/`
- Implement `ThermalUploadModal` component
- Create `ProcessingStatusModal` component
- Build `ResultsViewer` component for displaying orthomosaic images
- Add progress indicators and status displays

**Required Components**:

- `ThermalUploadButton` - Trigger thermal processing
- `FileUploadArea` - Drag & drop thermal images
- `ProcessingProgressCard` - Show real-time progress
- `OrthomosaicViewer` - Display generated 3D maps
- `ProcessingHistory` - List previous thermal processing tasks

#### Task 3.2: Project Page Integration

**Objective**: Integrate thermal processing into existing project views

**Actions**:

- Update `Projects.jsx` to include thermal processing button
- Add thermal processing section to project detail view
- Implement state management for thermal processing
- Add loading states and error handling
- Create responsive design for mobile devices

#### Task 3.3: Redux State Management

**Objective**: Implement state management for thermal processing

**Actions**:

- Create `thermalProcessing` Redux slice
- Add actions for:
  - `startThermalProcessing`
  - `updateProcessingStatus`
  - `setProcessingResult`
  - `clearProcessingData`
- Implement async thunks for API calls
- Add proper error state management

#### Task 3.4: Real-time Progress Updates

**Objective**: Implement WebSocket or polling for real-time updates

**Actions**:

- Choose between WebSocket or polling approach
- Implement progress polling service
- Add automatic status updates to UI
- Create notification system for completion
- Add proper cleanup on component unmount

### Phase 4: API Integration & Communication

#### Task 4.1: Axios Service Extension

**Objective**: Extend existing API service for thermal processing endpoints

**Actions**:

- Update `axiosInstance.js` with thermal processing endpoints
- Add file upload configurations
- Implement proper error handling for large file uploads
- Add request/response interceptors for thermal APIs
- Create API utility functions

#### Task 4.2: Error Handling & User Feedback

**Objective**: Implement comprehensive error handling

**Actions**:

- Create error handling utilities
- Add user-friendly error messages
- Implement retry mechanisms for failed uploads
- Add validation feedback for file uploads
- Create error recovery workflows

### Phase 5: Testing & Quality Assurance

#### Task 5.1: Backend Testing

**Objective**: Implement comprehensive backend testing

**Actions**:

- Create unit tests for NodeODM service
- Add integration tests for thermal processing endpoints
- Mock NodeODM API responses for testing
- Test file upload and processing workflows
- Add database transaction testing

#### Task 5.2: Frontend Testing

**Objective**: Implement frontend component and integration testing

**Actions**:

- Create unit tests for thermal processing components
- Add integration tests for Redux state management
- Test file upload functionality
- Add end-to-end testing for complete workflow
- Test responsive design on different devices

#### Task 5.3: Performance Testing

**Objective**: Ensure system performance under load

**Actions**:

- Test large file upload performance
- Benchmark thermal processing workflows
- Test concurrent thermal processing tasks
- Monitor memory usage during processing
- Add performance monitoring tools

### Phase 6: Configuration & Deployment

#### Task 6.1: Environment Configuration

**Objective**: Set up configuration management

**Actions**:

- Add NodeODM API configuration to environment variables
- Configure file upload limits and timeouts
- Set up staging and production configurations
- Add feature flags for thermal processing
- Configure monitoring and logging

#### Task 6.2: Docker & Kubernetes Updates

**Objective**: Update deployment configurations

**Actions**:

- Update Dockerfile for new dependencies
- Add thermal processing environment variables
- Update Kubernetes deployments
- Configure persistent volumes for temporary files
- Add health checks for thermal processing services

#### Task 6.3: Documentation & Deployment

**Objective**: Complete documentation and deployment

**Actions**:

- Create API documentation for thermal endpoints
- Write user guides for thermal processing features
- Update deployment instructions
- Create troubleshooting guides
- Add monitoring and alerting setup

## Implementation Priority

### High Priority (Implement First)

1. Task 1.1: Database Schema Updates
2. Task 1.2: NodeODM Service Module
3. Task 1.3: Thermal Processing Controller
4. Task 3.1: Basic UI Components
5. Task 3.2: Project Page Integration

### Medium Priority (Implement Second)

1. Task 1.4: Background Job Processing
2. Task 2.1: Enhanced File Upload System
3. Task 3.3: Redux State Management
4. Task 4.1: API Integration

### Low Priority (Implement Last)

1. Task 2.2: Advanced Storage Features
2. Task 3.4: Real-time Updates
3. Task 5.1-5.3: Comprehensive Testing
4. Task 6.1-6.3: Advanced Configuration

## Technical Considerations

### Performance

- Implement file streaming for large thermal images
- Add image compression before upload
- Use CDN for serving processed results
- Implement caching for frequently accessed results

### Security

- Validate file types and sizes
- Implement rate limiting for processing requests
- Add user authorization for thermal processing
- Secure API endpoints with proper authentication

### Scalability

- Design for horizontal scaling of processing tasks
- Implement queue-based processing for high loads
- Add monitoring for system resource usage
- Plan for NodeODM cluster deployment if needed

### Error Recovery

- Implement automatic retry for failed uploads
- Add manual retry options for users
- Create cleanup procedures for incomplete tasks
- Implement graceful degradation when NodeODM is unavailable

## Expected Development Timeline

- **Phase 1-2**: 2-3 weeks (Backend infrastructure and file management)
- **Phase 3**: 2-3 weeks (Frontend integration and UI)
- **Phase 4**: 1 week (API integration and communication)
- **Phase 5**: 1-2 weeks (Testing and quality assurance)
- **Phase 6**: 1 week (Configuration and deployment)

**Total Estimated Timeline**: 7-10 weeks

## Success Criteria

1. ✅ Users can upload thermal images from project page
2. ✅ System successfully communicates with NodeODM API
3. ✅ Real-time progress tracking works reliably
4. ✅ Generated orthomosaic images are displayed correctly
5. ✅ System handles errors gracefully
6. ✅ Performance meets user expectations
7. ✅ All tests pass consistently
8. ✅ Documentation is complete and accurate

## Next Steps

1. Review and approve this implementation plan
2. Set up development environment with NodeODM API access
3. Begin with Phase 1, Task 1.1 (Database Schema Updates)
4. Establish regular progress reviews and testing milestones
5. Coordinate with stakeholders for user acceptance testing

---

_This document should be reviewed and updated as implementation progresses and requirements evolve._
