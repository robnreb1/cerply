# Production Architecture: Background Content Generation

## Problem Statement
Content generation (Topics → Micro-lessons → Assessments) takes 5-15 minutes for a comprehensive module. Users need to be able to:
- Close the application and return later
- See real-time progress updates
- Access completed content immediately when it's ready

## Proposed Architecture

### 1. Job Queue System
**Technology**: Redis + Bull Queue (or AWS SQS)

**Flow**:
```
User Request → API → Create Job → Queue → Background Worker → Update Progress → Complete
```

**Job Schema**:
```typescript
{
  id: string              // Unique job ID
  moduleId: string        // Module being generated
  userId: string          // User who initiated
  organizationId: string  
  phase: 'topics' | 'microlessons' | 'assessments'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number        // 0-100%
  currentStep: string     // "Generating topic 5/26"
  createdAt: timestamp
  updatedAt: timestamp
  completedAt?: timestamp
  error?: string
}
```

### 2. WebSocket Connection for Real-Time Updates
**Technology**: Socket.io or AWS AppSync (GraphQL subscriptions)

**Client subscribes**:
```typescript
socket.on(`module:${moduleId}:progress`, (update) => {
  // Update UI with progress
  setProgress(update.progress)
  setCurrentStep(update.currentStep)
})

socket.on(`module:${moduleId}:complete`, (data) => {
  // Refresh module content
  fetchModule(moduleId)
})
```

### 3. Background Worker Service
**Technology**: Docker containers on AWS ECS/Fargate or GCP Cloud Run

**Worker Responsibilities**:
- Poll job queue
- Execute content generation phases sequentially
- Update job status in real-time
- Emit progress events via WebSocket
- Handle retries and failures

**Scaling**:
- Auto-scale workers based on queue depth
- Target: 1-2 concurrent modules per worker
- Est. 10 workers = 10-20 modules simultaneously

### 4. Database Changes

#### Add `generation_jobs` table:
```sql
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  phase TEXT NOT NULL CHECK (phase IN ('topics', 'microlessons', 'assessments')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_step TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  INDEX idx_generation_jobs_module (module_id),
  INDEX idx_generation_jobs_user (user_id),
  INDEX idx_generation_jobs_status (status)
);
```

#### Update `modules` table:
```sql
ALTER TABLE modules ADD COLUMN generation_status TEXT CHECK (generation_status IN ('draft', 'generating', 'complete', 'failed'));
ALTER TABLE modules ADD COLUMN generation_job_id UUID REFERENCES generation_jobs(id);
```

### 5. API Changes

#### New Endpoints:

**POST /api/v2/build/generate-async**
```typescript
{
  moduleId: string
  phase: 'topics' | 'microlessons' | 'assessments'
}
// Returns: { jobId: string, estimatedTime: number }
```

**GET /api/v2/build/jobs/:jobId**
```typescript
// Returns current job status
{
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number // 0-100
  currentStep: string
  result?: any
}
```

**DELETE /api/v2/build/jobs/:jobId**
```typescript
// Cancel a running job
```

### 6. Frontend Changes

#### Add JobStatusMonitor component:
```typescript
<JobStatusMonitor 
  moduleId={moduleId}
  onComplete={() => refreshModule()}
  onError={(error) => handleError(error)}
/>
```

#### Persistent state across sessions:
- Store active job IDs in localStorage
- On page load, check for in-progress jobs
- Resume monitoring if jobs are still running

### 7. Cost Optimization

**Smart Caching**:
- Cache topic generation results for similar queries (embedding similarity)
- Reuse micro-lessons across related modules
- Store common assessment patterns

**Batch Processing**:
- Queue multiple micro-lesson generations
- Batch API calls to reduce overhead

**Priority Queues**:
- Paid users: High priority
- Free users: Standard priority
- Background regeneration: Low priority

### 8. Monitoring & Observability

**Metrics to track**:
- Average generation time per phase
- Queue depth by priority
- Worker utilization
- Failure rates
- Cost per module (API tokens used)

**Alerts**:
- Queue depth > 100 (scale up)
- Generation failure rate > 10%
- Average time > 20 minutes (investigate)

### 9. Implementation Phases

**Phase 1 (MVP)** - 2 weeks:
- Redis + Bull Queue setup
- Basic background workers
- Job status tracking
- WebSocket progress updates

**Phase 2 (Scale)** - 2 weeks:
- Auto-scaling workers
- Smart caching layer
- Priority queues
- Retry logic

**Phase 3 (Optimize)** - 2 weeks:
- Content reuse detection
- Advanced monitoring
- Cost optimization
- Performance tuning

### 10. Example User Flow

1. User clicks "Generate Topics" → API creates job, returns jobId
2. Frontend subscribes to `module:${moduleId}:progress` via WebSocket
3. Worker picks up job from queue
4. Worker generates topics, emits progress: "Topic 5/26 generated"
5. Frontend updates progress bar in real-time
6. User closes browser
7. Worker continues, saves topics to DB incrementally
8. User returns later, frontend checks job status
9. If complete, shows "Topics ready!" and loads content
10. User clicks "Generate Micro-lessons" → repeat

### 11. Disaster Recovery

**Job Failures**:
- Automatic retries (max 3 attempts)
- Exponential backoff
- Detailed error logging
- User notification

**Worker Crashes**:
- Jobs returned to queue after timeout
- Idempotent operations (safe to retry)
- Partial results saved (resume from checkpoint)

**Database Failures**:
- Queue persists independently in Redis
- Workers can retry DB connections
- Jobs remain queued until DB recovers

---

## Cost Estimates (AWS)

- **ECS Fargate Workers**: ~$50/month (2 workers always on, scale to 10)
- **Redis ElastiCache**: ~$15/month (cache.t3.micro)
- **RDS PostgreSQL**: ~$30/month (db.t3.small)
- **API Gateway + Lambda**: ~$10/month (WebSocket connections)
- **Total Infrastructure**: ~$105/month base + scaling costs

**Per-module costs remain same**: ~$0.27-$0.68 (Haiku + GPT-5 Mini)

---

## Security Considerations

- Job IDs are UUIDs (not guessable)
- User authentication required to access jobs
- WebSocket connections authenticated via JWT
- Jobs automatically deleted after 7 days
- Rate limiting: 5 concurrent jobs per user

---

## Testing Strategy

1. **Unit Tests**: Job creation, status updates, queue operations
2. **Integration Tests**: End-to-end generation flow
3. **Load Tests**: 100 concurrent modules
4. **Chaos Tests**: Worker crashes, DB failures, network issues

