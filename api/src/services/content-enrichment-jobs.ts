/**
 * Background Content Enrichment Service
 * 
 * Handles async content generation for module previews
 * Uses in-memory storage for MVP (will use Redis/DB in production)
 */

import { generateWithPHDEnsemble } from './phd-ensemble';

export interface EnrichmentJob {
  jobId: string;
  modulePreview: any;
  topic: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// In-memory job storage (use Redis/DB in production)
const jobs = new Map<string, EnrichmentJob>();

/**
 * Start content enrichment job in background
 */
export async function startEnrichmentJob(modulePreview: any, topic: string): Promise<string> {
  const jobId = `enrich-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const job: EnrichmentJob = {
    jobId,
    modulePreview,
    topic,
    status: 'pending',
    progress: 0,
  };
  
  jobs.set(jobId, job);
  
  // Start the job asynchronously (don't await)
  processEnrichmentJob(jobId).catch(error => {
    console.error('[Enrichment Job] Failed:', error);
    const failedJob = jobs.get(jobId);
    if (failedJob) {
      failedJob.status = 'failed';
      failedJob.error = error.message;
      failedJob.completedAt = new Date();
    }
  });
  
  return jobId;
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string): EnrichmentJob | null {
  console.log('[getJobStatus] Looking for job:', jobId);
  console.log('[getJobStatus] Current jobs in map:', Array.from(jobs.keys()));
  const job = jobs.get(jobId) || null;
  console.log('[getJobStatus] Result:', job ? 'FOUND' : 'NOT FOUND');
  return job;
}

/**
 * Process enrichment job
 */
async function processEnrichmentJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  
  try {
    job.status = 'running';
    job.startedAt = new Date();
    job.progress = 10;
    
    console.log('[Enrichment Job] Starting job:', jobId, 'for topic:', job.topic);
    
    // Check if PhD ensemble is available
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    
    if (!hasOpenAI || !hasAnthropic) {
      console.log('[Enrichment Job] Skipping - API keys not available');
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      return;
    }
    
    // Get blocks to enrich
    const blocksToEnrich = job.modulePreview.contentBlocks.filter(
      (b: any) => (b.source === 'ai_generated' || b.source === 'public_web') && b.type === 'text'
    );
    
    if (blocksToEnrich.length === 0) {
      console.log('[Enrichment Job] No blocks to enrich');
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      return;
    }
    
    job.progress = 20;
    
    // Generate content using PhD ensemble
    console.log('[Enrichment Job] Calling PhD ensemble...');
    const ensembleResult = await generateWithPHDEnsemble(
      job.topic,
      `Create training content on ${job.topic} suitable for workplace learning`,
      'general'
    );
    
    job.progress = 80;
    console.log('[Enrichment Job] PhD ensemble completed, mapping to blocks...');
    
    // Map ensemble sections to content blocks
    const sectionMap = new Map<string, any>();
    for (const section of ensembleResult.finalSections) {
      sectionMap.set(section.title.toLowerCase(), {
        content: section.content,
        citations: ensembleResult.citations
      });
    }
    
    // Enrich each block
    for (const block of blocksToEnrich) {
      const blockTitleLower = block.title.toLowerCase();
      let enrichedData = null;
      
      // Try to find matching section
      for (const [sectionTitle, data] of sectionMap.entries()) {
        if (blockTitleLower.includes(sectionTitle) || sectionTitle.includes(blockTitleLower)) {
          enrichedData = data;
          break;
        }
      }
      
      // Fallback to first section
      if (!enrichedData && ensembleResult.finalSections.length > 0) {
        const firstSection = ensembleResult.finalSections[0];
        enrichedData = {
          content: firstSection.content,
          citations: ensembleResult.citations
        };
      }
      
      if (enrichedData) {
        block.content = enrichedData.content;
        block.citations = enrichedData.citations;
        
        // Update source label
        if (enrichedData.citations.length > 0) {
          const citation = enrichedData.citations[0];
          if (citation.type === 'journal' && citation.isPeerReviewed) {
            block.sourceLabel = `${citation.authors[0] || 'Academic'}, ${citation.year || 'Recent'}`;
          } else if (citation.type === 'book') {
            block.sourceLabel = `${citation.authors[0] || 'Book'}, ${citation.year || 'Recent'}`;
          } else if (citation.type === 'website') {
            block.sourceLabel = `${citation.title}`;
          } else {
            block.sourceLabel = `${citation.type}: ${citation.title}`;
          }
        }
        
        console.log(`[Enrichment Job] Enriched block "${block.title}"`);
      }
    }
    
    job.progress = 100;
    job.status = 'completed';
    job.completedAt = new Date();
    console.log('[Enrichment Job] Completed successfully:', jobId);
    
  } catch (error: any) {
    console.error('[Enrichment Job] Error:', error);
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = new Date();
    throw error;
  }
}

/**
 * Clean up old jobs (call periodically)
 */
export function cleanupOldJobs(maxAgeMs: number = 3600000): void {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    if (job.completedAt && (now - job.completedAt.getTime()) > maxAgeMs) {
      jobs.delete(jobId);
      console.log('[Enrichment Job] Cleaned up old job:', jobId);
    }
  }
}

