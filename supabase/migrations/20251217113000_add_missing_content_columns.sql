-- Add missing columns for full content request data
ALTER TABLE content_requests
ADD COLUMN IF NOT EXISTS primary_keywords text[],
ADD COLUMN IF NOT EXISTS secondary_keywords text[],
ADD COLUMN IF NOT EXISTS semantic_themes text[], -- Changed from single string to array if multi-select, or text if single. User code implies string? Let's check formData.
ADD COLUMN IF NOT EXISTS tone text,
ADD COLUMN IF NOT EXISTS word_count integer,
ADD COLUMN IF NOT EXISTS page_intent text; -- Re-adding in case it was missed
