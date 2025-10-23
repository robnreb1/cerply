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
    console.log('[Enrichment Job] Calling PhD ensemble for topic:', job.topic);
    
    // Build detailed context from module preview
    const moduleTitle = job.modulePreview.title || job.topic;
    const moduleDescription = job.modulePreview.description || '';
    const targetLevel = job.modulePreview.targetMasteryLevel || 'intermediate';
    
    // Create a focused prompt that ensures content is about the actual topic
    const detailedPrompt = `Create comprehensive educational content about: ${moduleTitle}

Context: ${moduleDescription}

Target audience level: ${targetLevel}

Focus EXCLUSIVELY on teaching ${moduleTitle}. Do NOT write about training modules, learning theory, or pedagogy in general. Write substantive content that teaches the actual subject matter.`;

    const ensembleResult = await generateWithPHDEnsemble(
      moduleTitle, // Use module title as the topic
      detailedPrompt,
      'general'
    );
    
    job.progress = 80;
    console.log('[Enrichment Job] PhD ensemble completed with', ensembleResult.finalSections.length, 'sections');
    console.log('[Enrichment Job] Section titles:', ensembleResult.finalSections.map((s: any) => s.title).join(', '));
    console.log('[Enrichment Job] Block titles to enrich:', blocksToEnrich.map((b: any) => b.title).join(', '));
    
    // Enrich each block by matching with ensemble sections
    let sectionIndex = 0;
    for (const block of blocksToEnrich) {
      const blockTitleLower = block.title.toLowerCase();
      let matchedSection = null;
      
      // First, try exact keyword matching
      for (const section of ensembleResult.finalSections) {
        const sectionTitleLower = section.title.toLowerCase();
        
        // Extract key words from both titles
        const blockWords = blockTitleLower.split(/\s+/).filter((w: string) => w.length > 3);
        const sectionWords = sectionTitleLower.split(/\s+/).filter((w: string) => w.length > 3);
        
        // Check for word overlap
        const overlap = blockWords.filter((w: string) => sectionWords.includes(w));
        
        if (overlap.length > 0 || sectionTitleLower.includes(blockTitleLower) || blockTitleLower.includes(sectionTitleLower)) {
          matchedSection = section;
          console.log(`[Enrichment Job] Matched "${block.title}" → "${section.title}" (keyword overlap)`);
          break;
        }
      }
      
      // Fallback: assign sections sequentially (better than always using first)
      if (!matchedSection && ensembleResult.finalSections.length > 0) {
        matchedSection = ensembleResult.finalSections[sectionIndex % ensembleResult.finalSections.length];
        console.log(`[Enrichment Job] Sequential match "${block.title}" → "${matchedSection.title}" (index ${sectionIndex})`);
        sectionIndex++;
      }
      
      if (matchedSection) {
        block.content = matchedSection.content;
        block.citations = ensembleResult.citations;
        
        // Update source label with first citation
        if (ensembleResult.citations.length > 0) {
          const citation = ensembleResult.citations[0];
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
        
        console.log(`[Enrichment Job] ✓ Enriched block "${block.title}" with ${matchedSection.content.length} chars`);
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

