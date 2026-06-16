-- Índice GIN con stemming en español para búsqueda semántica en knowledge_chunks
-- Reemplaza la búsqueda ILIKE por to_tsvector / plainto_tsquery

CREATE INDEX IF NOT EXISTS idx_chunks_content_spanish
  ON knowledge_chunks
  USING gin (to_tsvector('spanish', coalesce(content, '')));
