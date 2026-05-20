-- Add template_id to leads table for document template selection
ALTER TABLE leads ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL;

-- Also add description field to document_templates if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_templates' AND column_name = 'description'
  ) THEN
    ALTER TABLE document_templates ADD COLUMN description TEXT;
  END IF;
END $$;