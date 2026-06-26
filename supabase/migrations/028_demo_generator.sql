-- Columna para tracking de códigos generados por el demo público
ALTER TABLE valid_promo_codes ADD COLUMN given_by_generator BOOLEAN NOT NULL DEFAULT FALSE;
