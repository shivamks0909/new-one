-- Migration 011: LimeSurvey Survey Builder Integration
-- Adds mapping tables between Opinion Insights and LimeSurvey

-- 1. Extend studies table with LS survey mapping
ALTER TABLE studies ADD COLUMN IF NOT EXISTS ls_survey_id INTEGER;
ALTER TABLE studies ADD COLUMN IF NOT EXISTS ls_survey_status VARCHAR(50) DEFAULT 'NONE';
ALTER TABLE studies ADD COLUMN IF NOT EXISTS survey_config JSONB DEFAULT '{}'::jsonb;

-- 2. Survey Groups (OI's reference to LS question groups)
CREATE TABLE IF NOT EXISTS survey_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  ls_group_id INTEGER NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT DEFAULT '',
  group_order INTEGER NOT NULL DEFAULT 0,
  relevance_expression VARCHAR(500) DEFAULT '1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Survey Questions (OI's reference to LS questions)
CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES survey_groups(id) ON DELETE CASCADE,
  ls_question_id INTEGER NOT NULL,
  question_code VARCHAR(50),
  question_text TEXT NOT NULL DEFAULT '',
  question_type VARCHAR(10) NOT NULL,
  question_type_name VARCHAR(100),
  is_mandatory BOOLEAN DEFAULT FALSE,
  question_order INTEGER NOT NULL DEFAULT 0,
  relevance_expression VARCHAR(500) DEFAULT '1',
  answer_options JSONB DEFAULT '[]'::jsonb,
  attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_studies_ls_survey_id ON studies(ls_survey_id);
CREATE INDEX IF NOT EXISTS idx_studies_ls_survey_status ON studies(ls_survey_status);
CREATE INDEX IF NOT EXISTS idx_survey_groups_study_id ON survey_groups(study_id);
CREATE INDEX IF NOT EXISTS idx_survey_groups_ls_group_id ON survey_groups(ls_group_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_study_id ON survey_questions(study_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_group_id ON survey_questions(group_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_ls_question_id ON survey_questions(ls_question_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_question_order ON survey_questions(study_id, group_id, question_order);

-- 5. RLS policies for survey_groups (vendor isolation)
ALTER TABLE survey_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_select_all_survey_groups ON survey_groups;
CREATE POLICY admin_select_all_survey_groups ON survey_groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );

DROP POLICY IF EXISTS vendor_select_own_survey_groups ON survey_groups;
CREATE POLICY vendor_select_own_survey_groups ON survey_groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'VENDOR'
        AND u.status = 'ACTIVE'
        AND u.vendor_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM study_vendors sv
          WHERE sv.study_id = survey_groups.study_id
            AND sv.vendor_id = u.vendor_id
        )
    )
  );

-- 6. RLS policies for survey_questions (vendor isolation)
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_select_all_survey_questions ON survey_questions;
CREATE POLICY admin_select_all_survey_questions ON survey_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'ADMIN')
  );

DROP POLICY IF EXISTS vendor_select_own_survey_questions ON survey_questions;
CREATE POLICY vendor_select_own_survey_questions ON survey_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'VENDOR'
        AND u.status = 'ACTIVE'
        AND u.vendor_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM study_vendors sv
          WHERE sv.study_id = survey_questions.study_id
            AND sv.vendor_id = u.vendor_id
        )
    )
  );
