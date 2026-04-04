-- Allow contacts with only roj + mah (no Gregorian date)
ALTER TABLE contacts ALTER COLUMN date_of_birth DROP NOT NULL;

ALTER TABLE contacts ADD COLUMN roj INTEGER;
ALTER TABLE contacts ADD COLUMN mah INTEGER;

-- Ensure at least one path is valid: either Gregorian DOB or roj+mah
ALTER TABLE contacts ADD CONSTRAINT chk_contact_has_date_or_roj
  CHECK (date_of_birth IS NOT NULL OR (roj IS NOT NULL AND mah IS NOT NULL));

ALTER TABLE contacts ADD CONSTRAINT chk_roj_range
  CHECK (roj IS NULL OR (roj >= 1 AND roj <= 36));

ALTER TABLE contacts ADD CONSTRAINT chk_mah_range
  CHECK (mah IS NULL OR (mah >= 1 AND mah <= 12));
