-- Migration: Report System
-- Adds family report preferences and report history tables for automated email reports

-- Family report preferences
CREATE TABLE family_report_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE UNIQUE,
  report_email TEXT,                    -- Override parent email for reports
  weekly_report_enabled BOOLEAN DEFAULT true,
  monthly_report_enabled BOOLEAN DEFAULT true,
  settlement_email_enabled BOOLEAN DEFAULT true,
  timezone TEXT DEFAULT 'UTC',
  report_locale TEXT DEFAULT 'en' CHECK (report_locale IN ('en', 'zh-CN')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report history for audit and deduplication
CREATE TABLE report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('weekly', 'monthly', 'settlement')),
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  sent_to_email TEXT,
  report_data JSONB,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, report_type, report_period_start)
);

-- Indexes for efficient querying
CREATE INDEX idx_family_report_preferences_family_id ON family_report_preferences(family_id);
CREATE INDEX idx_report_history_family_id ON report_history(family_id);
CREATE INDEX idx_report_history_report_type ON report_history(report_type);
CREATE INDEX idx_report_history_status ON report_history(status);
CREATE INDEX idx_report_history_period ON report_history(report_period_start, report_period_end);

-- Enable RLS
ALTER TABLE family_report_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for family_report_preferences
-- Parents can view and manage their family's report preferences
CREATE POLICY "Parents can view own family report preferences"
  ON family_report_preferences
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM users
      WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Parents can insert own family report preferences"
  ON family_report_preferences
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM users
      WHERE id = auth.uid() AND role = 'parent'
    )
  );

CREATE POLICY "Parents can update own family report preferences"
  ON family_report_preferences
  FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM users
      WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- RLS Policies for report_history
-- Parents can view their family's report history
CREATE POLICY "Parents can view own family report history"
  ON report_history
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM users
      WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Service role can insert/update report history (for cron jobs)
-- Note: These operations will be done via admin client with service role

-- Create updated_at trigger for family_report_preferences
CREATE OR REPLACE FUNCTION update_family_report_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_family_report_preferences_updated_at
  BEFORE UPDATE ON family_report_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_family_report_preferences_updated_at();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON family_report_preferences TO authenticated;
GRANT SELECT ON report_history TO authenticated;
