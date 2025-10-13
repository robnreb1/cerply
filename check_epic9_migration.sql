-- Quick check if Epic 9 tables exist
SELECT 
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'learner_profiles') as learner_profiles_exists,
  EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'topic_comprehension') as topic_comprehension_exists,
  EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'response_time_ms') as attempts_response_time_exists,
  EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'attempts' AND column_name = 'difficulty_level') as attempts_difficulty_exists;
