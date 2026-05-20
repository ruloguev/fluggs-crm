-- Fix: Assign source_id to Facebook leads that arrived without a source
-- This handles leads created before the auto-create source fix

-- Step 1: Ensure "Facebook Leads" source exists for companies that have FB leads without source
INSERT INTO lead_sources (company_id, name, icon, color)
SELECT DISTINCT l.company_id, 'Facebook Leads', 'facebook', '#1877F2'
FROM leads l
WHERE l.metadata->>'facebook_lead_id' IS NOT NULL
  AND l.source_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM lead_sources ls
    WHERE ls.company_id = l.company_id
    AND ls.name ILIKE 'facebook%'
  );

-- Step 2: Update leads that have facebook metadata but no source_id
UPDATE leads
SET source_id = (
  SELECT id FROM lead_sources
  WHERE company_id = leads.company_id
  AND name ILIKE 'facebook%'
  LIMIT 1
)
WHERE metadata->>'facebook_lead_id' IS NOT NULL
  AND source_id IS NULL;
