ALTER TABLE "WorldEntity"
  ADD COLUMN "age" INTEGER,
  ADD COLUMN "ethnicity" TEXT,
  ADD COLUMN "skinTone" TEXT;

ALTER TABLE "WorldEntityVersion"
  ADD COLUMN "age" INTEGER,
  ADD COLUMN "ethnicity" TEXT,
  ADD COLUMN "skinTone" TEXT;

UPDATE "WorldEntity"
SET
  "age" = 20,
  "skinTone" = 'Fitzpatrick Type II Pinkish-ivory skin'
WHERE "type" = 'CHARACTER';
