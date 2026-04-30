CREATE TABLE IF NOT EXISTS service_requests (
  id BIGSERIAL PRIMARY KEY,
  student_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile_number VARCHAR(15) NOT NULL,
  admission_number TEXT NOT NULL,
  course VARCHAR(10) NOT NULL CHECK (course IN ('LLB', 'LLM')),
  semester VARCHAR(2) NOT NULL,
  batch VARCHAR(4) NOT NULL,
  request_subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),
  status VARCHAR(20) NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'In Progress', 'Resolved', 'Closed')),
  uploaded_file_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests (status);
CREATE INDEX IF NOT EXISTS idx_service_requests_priority ON service_requests (priority);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests (created_at DESC);
