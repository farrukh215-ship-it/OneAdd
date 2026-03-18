DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'Schema validation failed: User.role missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Listing' AND column_name = 'inspectionStatus'
  ) THEN
    RAISE EXCEPTION 'Schema validation failed: Listing.inspectionStatus missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'InspectionRequest'
  ) THEN
    RAISE EXCEPTION 'Schema validation failed: InspectionRequest table missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'InspectionReport'
  ) THEN
    RAISE EXCEPTION 'Schema validation failed: InspectionReport table missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'InspectionAuditLog'
  ) THEN
    RAISE EXCEPTION 'Schema validation failed: InspectionAuditLog table missing';
  END IF;
END $$;
