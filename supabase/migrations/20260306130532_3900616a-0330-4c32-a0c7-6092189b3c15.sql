
-- Step 1: Migrate existing data to new category values
UPDATE tasks SET category = 'general' WHERE category = 'custom';
UPDATE tasks SET category = 'ai_workflows' WHERE category = 'ai';
UPDATE tasks SET category = 'general' WHERE category = 'skilled';
UPDATE tasks SET category = 'general' WHERE category = 'student';

UPDATE skills SET category = 'ai_workflows' WHERE category = 'ai';
UPDATE skills SET category = 'general' WHERE category = 'custom';
UPDATE skills SET category = 'general' WHERE category = 'skilled';
UPDATE skills SET category = 'general' WHERE category = 'student';

UPDATE doer_skills SET category = 'ai_workflows' WHERE category = 'ai';
UPDATE doer_skills SET category = 'general' WHERE category = 'custom';
UPDATE doer_skills SET category = 'general' WHERE category = 'skilled';
UPDATE doer_skills SET category = 'general' WHERE category = 'student';

UPDATE portfolio_items SET category = 'ai_workflows' WHERE category = 'ai';
UPDATE portfolio_items SET category = 'general' WHERE category = 'custom';
UPDATE portfolio_items SET category = 'general' WHERE category = 'skilled';
UPDATE portfolio_items SET category = 'general' WHERE category = 'student';

-- Step 2: Recreate the enum without old values
-- Postgres doesn't support DROP VALUE from enum, so we recreate it
ALTER TYPE task_category RENAME TO task_category_old;

CREATE TYPE task_category AS ENUM ('ai_workflows', 'vibe_coding', 'prompt_engineering', 'ai_video', 'web_design', 'general');

-- Step 3: Update all columns to use the new enum
ALTER TABLE tasks ALTER COLUMN category TYPE task_category USING category::text::task_category;
ALTER TABLE skills ALTER COLUMN category TYPE task_category USING category::text::task_category;
ALTER TABLE doer_skills ALTER COLUMN category TYPE task_category USING category::text::task_category;
ALTER TABLE portfolio_items ALTER COLUMN category TYPE task_category USING category::text::task_category;

-- Step 4: Drop the old enum
DROP TYPE task_category_old;
