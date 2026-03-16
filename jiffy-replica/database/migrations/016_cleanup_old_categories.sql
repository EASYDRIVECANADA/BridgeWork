-- Migration 016: Cleanup old inactive categories
-- Removes all inactive categories EXCEPT "QA Testing"
-- Also removes old inactive services that reference old categories

-- First, delete old inactive services whose category is inactive (and not QA Testing)
DELETE FROM services
WHERE is_active = false
  AND category_id IN (
    SELECT id FROM service_categories
    WHERE is_active = false
      AND name != 'QA Testing'
  );

-- Now delete old inactive categories except QA Testing
DELETE FROM service_categories
WHERE is_active = false
  AND name != 'QA Testing';
