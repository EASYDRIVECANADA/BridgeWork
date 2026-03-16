-- Service and Category Image Upload Support
-- Note: image_url columns already exist in both tables from initial schema
-- This migration adds support for image upload tracking and metadata

-- Add metadata columns for image tracking
ALTER TABLE service_categories
ADD COLUMN IF NOT EXISTS image_metadata JSONB DEFAULT '{}'::JSONB;

ALTER TABLE services
ADD COLUMN IF NOT EXISTS image_metadata JSONB DEFAULT '{}'::JSONB;

-- Create a table to track uploaded images
CREATE TABLE service_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('service', 'category')),
    entity_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type TEXT,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_service_images_entity ON service_images(entity_type, entity_id);
CREATE INDEX idx_service_images_uploaded_by ON service_images(uploaded_by);

-- RLS Policies
ALTER TABLE service_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view images
CREATE POLICY "Anyone can view service images"
    ON service_images FOR SELECT
    USING (true);

-- Admins can upload images
CREATE POLICY "Admins can upload images"
    ON service_images FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can delete images
CREATE POLICY "Admins can delete images"
    ON service_images FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

COMMENT ON TABLE service_images IS 'Tracks uploaded images for services and categories';
COMMENT ON COLUMN service_images.entity_type IS 'Type of entity: service or category';
COMMENT ON COLUMN service_images.entity_id IS 'ID of the service or category';
