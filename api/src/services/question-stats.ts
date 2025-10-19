/**
 * Question Performance Stats Service
 * Tracks question-level analytics for manager module workflows
 */

import { query, single } from '../db';

interface QuestionAttemptData {
  questionId: string;
  moduleId: string;
  wasCorrect: boolean;
  timeSeconds: number;
  wasSkipped?: boolean;
  hintRequested?: boolean;
}

/**
 * Update question performance stats after a learner attempts a question
 */
export async function recordQuestionAttempt(data: QuestionAttemptData): Promise<void> {
  const { questionId, moduleId, wasCorrect, timeSeconds, wasSkipped, hintRequested } = data;

  // Check if stats already exist
  const existing = await single<any>(
    'SELECT * FROM question_performance_stats WHERE question_id = $1 AND module_id = $2',
    [questionId, moduleId]
  );

  if (existing) {
    // Update existing stats
    const newAttemptsCount = existing.attempts_count + 1;
    const newCorrectCount = existing.correct_count + (wasCorrect ? 1 : 0);
    const newIncorrectCount = existing.incorrect_count + (wasCorrect ? 0 : 1);
    const newSkipCount = existing.skip_count + (wasSkipped ? 1 : 0);
    const newHintCount = existing.hint_requests_count + (hintRequested ? 1 : 0);

    // Calculate new average time (running average)
    const totalTime = (existing.avg_time_seconds || 0) * existing.attempts_count + timeSeconds;
    const newAvgTime = totalTime / newAttemptsCount;

    // Determine perceived difficulty based on success rate
    const successRate = newCorrectCount / newAttemptsCount;
    let perceivedDifficulty = 'appropriate';
    if (successRate < 0.40) {
      perceivedDifficulty = 'too_hard';
    } else if (successRate > 0.85) {
      perceivedDifficulty = 'too_easy';
    }

    await query(
      `UPDATE question_performance_stats
       SET 
         attempts_count = $1,
         correct_count = $2,
         incorrect_count = $3,
         avg_time_seconds = $4,
         perceived_difficulty = $5,
         skip_count = $6,
         hint_requests_count = $7,
         last_attempted_at = NOW(),
         last_updated = NOW()
       WHERE question_id = $8 AND module_id = $9`,
      [
        newAttemptsCount,
        newCorrectCount,
        newIncorrectCount,
        newAvgTime,
        perceivedDifficulty,
        newSkipCount,
        newHintCount,
        questionId,
        moduleId,
      ]
    );
  } else {
    // Create new stats record
    const perceivedDifficulty = wasCorrect ? 'too_easy' : 'too_hard'; // Initial guess with 1 attempt

    await query(
      `INSERT INTO question_performance_stats (
        question_id,
        module_id,
        attempts_count,
        correct_count,
        incorrect_count,
        avg_time_seconds,
        perceived_difficulty,
        skip_count,
        hint_requests_count,
        first_attempted_at,
        last_attempted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        questionId,
        moduleId,
        1, // attempts_count
        wasCorrect ? 1 : 0,
        wasCorrect ? 0 : 1,
        timeSeconds,
        perceivedDifficulty,
        wasSkipped ? 1 : 0,
        hintRequested ? 1 : 0,
      ]
    );
  }
}

/**
 * Get performance stats for a specific question
 */
export async function getQuestionStats(questionId: string, moduleId: string) {
  return single<any>(
    `SELECT 
      *,
      CASE 
        WHEN attempts_count > 0 THEN ROUND((correct_count::NUMERIC / attempts_count::NUMERIC), 2)
        ELSE 0
      END as success_rate
     FROM question_performance_stats
     WHERE question_id = $1 AND module_id = $2`,
    [questionId, moduleId]
  );
}

/**
 * Get all question stats for a module
 */
export async function getModuleQuestionStats(moduleId: string) {
  const result = await query<any>(
    `SELECT 
      question_id,
      attempts_count,
      correct_count,
      incorrect_count,
      CASE 
        WHEN attempts_count > 0 THEN ROUND((correct_count::NUMERIC / attempts_count::NUMERIC), 2)
        ELSE 0
      END as success_rate,
      avg_time_seconds,
      perceived_difficulty,
      skip_count,
      hint_requests_count,
      last_attempted_at
     FROM question_performance_stats
     WHERE module_id = $1
     ORDER BY attempts_count DESC, success_rate ASC`,
    [moduleId]
  );

  return result.rows;
}

