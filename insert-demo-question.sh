#!/bin/bash
# Insert a demo question into Render database for testing
# This creates the minimum data needed to test Phase 2

set -e

echo "📝 Inserting Demo Question for Phase 2 Testing"
echo "==============================================="
echo ""

DB_URL="postgresql://cerply_app:ZTv6yzkW3EaO7Hf3n4y12VrdRGtikO8T@dpg-d324843uibrs739hldp0-a.frankfurt-postgres.render.com/cerply"

echo "1️⃣ Creating demo subject..."
SUBJECT_ID=$(psql "$DB_URL" -t -c "
INSERT INTO subjects (title, icon, description) 
VALUES ('Computer Science', '💻', 'Fundamental concepts in computer science')
ON CONFLICT (title) DO NOTHING
RETURNING id;
" | xargs)

if [ -z "$SUBJECT_ID" ]; then
  # Subject already exists, get it
  SUBJECT_ID=$(psql "$DB_URL" -t -c "SELECT id FROM subjects WHERE title = 'Computer Science' LIMIT 1;" | xargs)
fi

if [ -z "$SUBJECT_ID" ]; then
  # Still empty, just get any subject
  SUBJECT_ID=$(psql "$DB_URL" -t -c "SELECT id FROM subjects LIMIT 1;" | xargs)
fi

echo "✅ Subject ID: $SUBJECT_ID"

echo ""
echo "2️⃣ Creating demo topic..."
TOPIC_ID=$(psql "$DB_URL" -t -c "
INSERT INTO topics (subject_id, title) 
VALUES ('$SUBJECT_ID', 'Machine Learning Basics')
RETURNING id;
" | xargs 2>/dev/null)

if [ -z "$TOPIC_ID" ]; then
  # Topic already exists, get it
  TOPIC_ID=$(psql "$DB_URL" -t -c "SELECT id FROM topics WHERE subject_id = '$SUBJECT_ID' LIMIT 1;" | xargs)
fi

echo "✅ Topic ID: $TOPIC_ID"

echo ""
echo "3️⃣ Creating demo module..."
MODULE_ID=$(psql "$DB_URL" -t -c "
INSERT INTO modules_v2 (topic_id, title) 
VALUES ('$TOPIC_ID', 'Introduction to LLMs')
RETURNING id;
" | xargs 2>/dev/null)

if [ -z "$MODULE_ID" ]; then
  # Module already exists, get it
  MODULE_ID=$(psql "$DB_URL" -t -c "SELECT id FROM modules_v2 WHERE topic_id = '$TOPIC_ID' LIMIT 1;" | xargs)
fi

echo "✅ Module ID: $MODULE_ID"

echo ""
echo "4️⃣ Creating demo quiz..."
QUIZ_ID=$(psql "$DB_URL" -t -c "
INSERT INTO quizzes (module_id, title) 
VALUES ('$MODULE_ID', 'Quiz 1: LLM Fundamentals')
RETURNING id;
" | xargs 2>/dev/null)

if [ -z "$QUIZ_ID" ]; then
  # Quiz already exists, get it
  QUIZ_ID=$(psql "$DB_URL" -t -c "SELECT id FROM quizzes WHERE module_id = '$MODULE_ID' LIMIT 1;" | xargs)
fi

echo "✅ Quiz ID: $QUIZ_ID"

echo ""
echo "5️⃣ Creating demo question..."
QUESTION_ID=$(psql "$DB_URL" -t -c "
INSERT INTO questions (quiz_id, type, stem, options, correct_answer, guidance_text) 
VALUES (
  '$QUIZ_ID', 
  'mcq', 
  'What does LLM stand for in the context of AI?',
  '[\"Large Language Model\", \"Linear Learning Machine\", \"Linguistic Logic Module\", \"Local Language Manager\"]'::jsonb,
  0,
  'LLM stands for Large Language Model. These are AI models trained on vast amounts of text data to understand and generate human-like language. Examples include GPT, Claude, and others.'
)
RETURNING id;
" | xargs 2>/dev/null)

echo "✅ Question ID: $QUESTION_ID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Demo Question Created Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Question Details:"
echo "  Subject: Computer Science 💻"
echo "  Topic: Machine Learning Basics"
echo "  Module: Introduction to LLMs"
echo "  Quiz: Quiz 1: LLM Fundamentals"
echo ""
echo "  Question: What does LLM stand for in the context of AI?"
echo "  Options:"
echo "    A) Large Language Model ✓"
echo "    B) Linear Learning Machine"
echo "    C) Linguistic Logic Module"
echo "    D) Local Language Manager"
echo ""
echo "  ID: $QUESTION_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Now you can test Phase 2:"
echo ""
echo "  DATABASE_URL='$DB_URL' \\"
echo "  ./test-with-render-db.sh"
echo ""

