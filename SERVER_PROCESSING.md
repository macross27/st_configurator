# Server-Side Image Processing with Job Queue

This application now includes a robust server-side image processing system with job queuing to handle multiple users and prevent server overload.

## 🚀 Quick Start

### Start Both Client & Server
```bash
npm start
```

### Start Individually
```bash
# Client only (port 3020+)
npm run dev

# Server only (port 3001)
npm run server
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  Express API    │───▶│   Job Queue     │
│ (Browser/Vite)  │    │   (port 3001)   │    │  (In-Memory)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Image Processor │    │  Sharp Library  │
                       │    (Canvas)     │    │ (High Performance)│
                       └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
├── .env                    # Environment configuration
├── server.js               # Main Express server
├── lib/
│   ├── jobQueue.js         # Job queue implementation
│   ├── imageProcessor.js   # Sharp-based image processing
│   └── serverApiClient.js  # Client-side API wrapper
├── uploads/                # Temporary upload storage
├── processed/              # Processed images storage
└── temp/                   # Temporary files
```

## ⚙️ Configuration (.env)

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Job Queue Configuration
MAX_CONCURRENT_JOBS=3           # How many jobs process simultaneously
JOB_TIMEOUT_MS=30000           # 30 second timeout per job
MAX_QUEUE_SIZE=100             # Maximum queued jobs
CLEANUP_INTERVAL_MS=60000      # Cleanup old jobs every minute

# Image Processing Configuration
MAX_FILE_SIZE_MB=50            # 50MB file size limit
MAX_IMAGE_WIDTH=1024           # Resize width limit
MAX_IMAGE_HEIGHT=1024          # Resize height limit
COMPRESSION_QUALITY=0.8        # Image compression quality (0.1-1.0)
SUPPORTED_FORMATS=jpeg,png,webp,gif

# Rate Limiting (per IP)
RATE_LIMIT_WINDOW_MS=900000    # 15 minute window
RATE_LIMIT_MAX_REQUESTS=100    # 100 requests per window
```

## 🔥 Key Features

### ✅ Job Queue System
- **Concurrent Processing**: Configurable simultaneous job limit
- **Priority Queuing**: High-priority jobs process first
- **Timeout Protection**: Jobs timeout to prevent hanging
- **Auto Retry**: Failed jobs retry with exponential backoff
- **Memory Management**: Automatic cleanup of old jobs

### ✅ Smart Client Fallback
- **Server Detection**: Automatically detects server availability
- **Graceful Degradation**: Falls back to client-side processing
- **Hybrid Processing**: Uses best method for each situation

### ✅ Performance Optimizations
- **Sharp Library**: Ultra-fast server-side image processing
- **WebP Conversion**: Automatic format optimization
- **Progressive JPEG**: Better loading experience
- **Memory Monitoring**: Prevents server overload

### ✅ User Experience
- **Real-time Progress**: Live updates during processing
- **Detailed Notifications**: Clear feedback on what happened
- **Batch Processing**: Handle multiple files efficiently
- **Error Recovery**: Graceful error handling and recovery

## 📊 API Endpoints

### POST `/api/process/single`
Process a single image file.

**Request:**
```javascript
const formData = new FormData();
formData.append('image', file);
formData.append('priority', '1'); // optional

fetch('/api/process/single', {
    method: 'POST',
    body: formData
});
```

**Response:**
```json
{
    "success": true,
    "jobId": "uuid-here",
    "estimatedTime": 5000,
    "message": "Image processing job queued successfully"
}
```

### POST `/api/process/batch`
Process multiple images in batch.

**Request:**
```javascript
const formData = new FormData();
files.forEach(file => formData.append('images', file));

fetch('/api/process/batch', {
    method: 'POST',
    body: formData
});
```

### GET `/api/job/:jobId`
Get job status and results.

**Response:**
```json
{
    "jobId": "uuid-here",
    "status": "completed",
    "result": {
        "success": true,
        "processingTime": 1250,
        "originalFile": {
            "name": "image.jpg",
            "size": 2048,
            "format": "jpeg",
            "dimensions": {"width": 3024, "height": 4032}
        },
        "processedFile": {
            "filename": "processed_uuid.webp",
            "size": 245,
            "format": "webp",
            "dimensions": {"width": 1024, "height": 1365},
            "url": "/api/images/processed_uuid.webp"
        },
        "optimization": {
            "wasResized": true,
            "formatChanged": true,
            "compressionRatio": "88.0%",
            "sizeSaved": 1803
        }
    }
}
```

### GET `/api/images/:filename`
Serve processed images with caching headers.

### GET `/api/stats`
Get server and queue statistics.

### GET `/api/health`
Health check endpoint for monitoring.

## 🔧 Job Queue Details

### Job States
- **queued**: Waiting to be processed
- **processing**: Currently being processed
- **completed**: Successfully completed
- **failed**: Failed after retries
- **retrying**: Retrying after failure

### Queue Features
- **Priority System**: Higher priority jobs process first
- **Concurrent Limits**: Configurable max simultaneous jobs
- **Timeout Protection**: Jobs timeout to prevent hanging
- **Retry Logic**: Exponential backoff for failed jobs
- **Memory Cleanup**: Automatic cleanup of expired jobs

### Queue Statistics
```javascript
{
    "totalJobs": 150,
    "completedJobs": 142,
    "failedJobs": 3,
    "currentQueueSize": 2,
    "currentProcessingCount": 3,
    "averageProcessingTime": 2500,
    "completedInLast24h": 89,
    "failedInLast24h": 1
}
```

## 🛠️ Performance Tuning

### Server Configuration
```bash
# For high-traffic scenarios
MAX_CONCURRENT_JOBS=5          # Increase for more powerful servers
JOB_TIMEOUT_MS=60000          # Increase for complex images
MAX_QUEUE_SIZE=500            # Increase queue capacity

# For resource-constrained servers
MAX_CONCURRENT_JOBS=2          # Reduce concurrent processing
MAX_FILE_SIZE_MB=20           # Limit file sizes
```

### Client Configuration
```javascript
// In main.js constructor
this.serverApiClient = new ServerApiClient({
    serverUrl: 'http://localhost:3001',
    pollInterval: 500,         // Poll every 500ms for faster updates
    maxPollTime: 180000       // 3 minute max wait time
});
```

## 🔍 Monitoring & Debugging

### Server Logs
The server provides detailed logging:
```
🚀 Image Processing Server running on port 3001
📊 Max concurrent jobs: 3
⏱️  Job timeout: 30000ms
🔄 Job abc123 started processing
✅ Job abc123 completed in 1250ms
❌ Job def456 failed: Image processing failed
```

### Client Logs
The client logs processing decisions:
```
✅ Server-side image processing available
🌐 Processing image.jpg on server...
✅ Server processing completed
💻 Processing fallback.jpg on client...
```

### Health Monitoring
Monitor server health at `/api/health`:
```bash
curl http://localhost:3001/api/health
```

## 🚨 Error Handling

### Common Scenarios
1. **Server Unavailable**: Automatic fallback to client processing
2. **Job Timeout**: Jobs retry with exponential backoff
3. **Memory Issues**: Processing queue pauses until memory clears
4. **Invalid Files**: Clear error messages to user
5. **Network Issues**: Retry logic with user feedback

### Error Recovery
- **Graceful Degradation**: Always falls back to working method
- **User Feedback**: Clear notifications explain what's happening
- **Automatic Retry**: Transient failures retry automatically
- **Manual Recovery**: Users can retry failed operations

## 🔒 Security Features

- **File Type Validation**: Only allows approved image formats
- **File Size Limits**: Prevents abuse with large files
- **Rate Limiting**: IP-based request limiting
- **CORS Protection**: Configured allowed origins
- **Helmet Security**: Security headers and protections
- **Path Traversal Protection**: Secure file serving

## 🚀 Production Deployment

### Docker Example
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### Environment Variables
```bash
# Production settings
NODE_ENV=production
PORT=3001
MAX_CONCURRENT_JOBS=5
RATE_LIMIT_MAX_REQUESTS=50

# Configure allowed origins
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Process Management
```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name "image-processor"
pm2 startup
pm2 save
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use Redis for job queue instead of in-memory
- Implement sticky sessions for real-time updates
- Add load balancer for multiple server instances

### Vertical Scaling
- Increase `MAX_CONCURRENT_JOBS` for powerful servers
- Monitor memory usage and adjust limits
- Use SSD storage for faster file I/O

### CDN Integration
- Serve processed images through CDN
- Implement pre-signed URLs for direct uploads
- Add image optimization at CDN level

---

## 🎯 Usage Examples

### Single Image Processing
```javascript
// The client automatically detects and uses server processing
const layer = await configurator.addLogoLayer(file);
// User sees: "Image processed successfully on server"
```

### Batch Processing
```javascript
// Process multiple files with progress updates
await configurator.processMultipleImages(files);
// User sees real-time progress for each file
```

### Manual Server Check
```javascript
const isServerHealthy = await configurator.serverApiClient.checkServerHealth();
console.log('Server status:', isServerHealthy);
```

The system automatically handles all complexity, providing users with:
- ✅ **Fast processing** via server-side optimization
- ✅ **Reliable fallback** when server unavailable
- ✅ **Clear feedback** on what's happening
- ✅ **Progress tracking** for batch operations
- ✅ **Consistent experience** across all devices