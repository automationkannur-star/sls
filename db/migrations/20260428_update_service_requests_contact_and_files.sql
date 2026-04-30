ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15),
ADD COLUMN IF NOT EXISTS course VARCHAR(10),
ADD COLUMN IF NOT EXISTS uploaded_file_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE service_requests
SET
  email = COALESCE(NULLIF(TRIM(email), ''), 'unknown@example.com'),
  mobile_number = COALESCE(NULLIF(TRIM(mobile_number), ''), '0000000000'),
  course = COALESCE(NULLIF(TRIM(course), ''), 'LLB')
WHERE
  email IS NULL OR TRIM(email) = '' OR
  mobile_number IS NULL OR TRIM(mobile_number) = '' OR
  course IS NULL OR TRIM(course) = '';

ALTER TABLE service_requests
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN mobile_number SET NOT NULL,
ALTER COLUMN course SET NOT NULL;

ALTER TABLE service_requests
DROP CONSTRAINT IF EXISTS service_requests_course_check,
ADD CONSTRAINT service_requests_course_check CHECK (course IN ('LLB', 'LLM'));
