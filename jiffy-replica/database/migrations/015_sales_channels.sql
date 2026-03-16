-- Migration 015: Sales Channels for Residential/Commercial
-- Adds sales_channel support to services and categories

-- Add sales_channel to service_categories (Residential only has categories)
ALTER TABLE service_categories ADD COLUMN IF NOT EXISTS sales_channel TEXT DEFAULT 'residential';

-- Add sales_channel, rate, and emergency columns to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS sales_channel TEXT DEFAULT 'residential';
ALTER TABLE services ADD COLUMN IF NOT EXISTS rate TEXT DEFAULT 'quote';
ALTER TABLE services ADD COLUMN IF NOT EXISTS emergency TEXT DEFAULT 'no';

-- Create indexes for channel filtering
CREATE INDEX IF NOT EXISTS idx_service_categories_channel ON service_categories(sales_channel);
CREATE INDEX IF NOT EXISTS idx_services_channel ON services(sales_channel);

-- Deactivate all old seed categories (they don't match new structure)
UPDATE service_categories SET is_active = false WHERE sales_channel = 'residential';

-- Insert the two Residential categories
INSERT INTO service_categories (id, name, slug, description, icon_url, image_url, display_order, is_active, sales_channel)
VALUES
  ('c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'General Services', 'general-services', 'General home services including electrical, plumbing, painting, and more', '🏠', NULL, 1, true, 'residential'),
  ('c0eebc99-0001-4ef8-bb6d-6bb9bd380a02', 'Repairs & Service', 'repairs-service', 'Repair and maintenance services for your home', '🔧', NULL, 2, true, 'residential')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_url = EXCLUDED.icon_url,
  display_order = EXCLUDED.display_order,
  is_active = true,
  sales_channel = 'residential';

-- Deactivate old services that don't match new structure
UPDATE services SET is_active = false;

-- Insert Residential > General Services
INSERT INTO services (id, category_id, name, slug, description, short_description, base_price, pricing_type, image_url, is_active, sales_channel, rate, emergency) VALUES
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'Electrical', 'res-electrical', 'Electrical repairs and installations for residential properties', 'Residential electrical services', 100.00, 'hourly', 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=400', true, 'residential', 'yes', 'yes'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a02', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'Plumbing', 'res-plumbing', 'Plumbing repairs and installations', 'Residential plumbing services', 100.00, 'hourly', 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400', true, 'residential', 'yes', 'yes'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a03', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'Painting', 'res-painting', 'Interior and exterior painting services', 'Residential painting services', 250.00, 'custom', 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=400', true, 'residential', 'quote', 'no'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a04', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'Drywall & Mudding', 'res-drywall-mudding', 'Drywall repair and mudding services', 'Drywall and mudding', 150.00, 'custom', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400', true, 'residential', 'quote', 'no'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a05', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'HVAC (Heating & Cooling)', 'res-hvac', 'Heating and cooling services', 'HVAC services', 120.00, 'hourly', 'https://images.unsplash.com/photo-1635274531661-1c5a5e9b0d3d?q=80&w=400', true, 'residential', 'yes', 'yes'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a06', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'Roofing', 'res-roofing', 'Roofing repairs and installations', 'Residential roofing services', 2500.00, 'custom', 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?q=80&w=400', true, 'residential', 'yes', 'yes'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a07', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'Eavestroughs', 'res-eavestroughs', 'Eavestrough repair and cleaning', 'Eavestrough services', 150.00, 'custom', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', true, 'residential', 'quote', 'no'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a08', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'Windows & Doors', 'res-windows-doors', 'Window and door installation and repair', 'Windows & doors services', 120.00, 'custom', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', true, 'residential', 'quote', 'no'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a09', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'Decks & Fences', 'res-decks-fences', 'Deck and fence construction and repair', 'Decks and fences', 500.00, 'custom', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400', true, 'residential', 'quote', 'no'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a10', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'Windows', 'res-windows', 'Window cleaning and repair', 'Window services', 120.00, 'custom', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', true, 'residential', 'quote', 'no'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a11', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a01', 'Landscaping', 'res-landscaping', 'Lawn maintenance and landscaping', 'Landscaping services', 40.00, 'custom', 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', true, 'residential', 'quote', 'no')
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, name = EXCLUDED.name, description = EXCLUDED.description,
  short_description = EXCLUDED.short_description, base_price = EXCLUDED.base_price,
  pricing_type = EXCLUDED.pricing_type, image_url = EXCLUDED.image_url, is_active = true,
  sales_channel = EXCLUDED.sales_channel, rate = EXCLUDED.rate, emergency = EXCLUDED.emergency;

-- Insert Residential > Repairs & Service
INSERT INTO services (id, category_id, name, slug, description, short_description, base_price, pricing_type, image_url, is_active, sales_channel, rate, emergency) VALUES
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a02', 'Appliance Repair & Install', 'res-appliance-repair', 'Appliance repair and installation services', 'Appliance repair & install', 120.00, 'hourly', 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=400', true, 'residential', 'yes', 'no'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a13', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a02', 'Handyman', 'res-handyman', 'General handyman services', 'Handyman services', 80.00, 'hourly', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', true, 'residential', 'yes', 'yes'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a14', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a02', 'Locksmith', 'res-locksmith', 'Locksmith services', 'Locksmith services', 120.00, 'fixed', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=400', true, 'residential', 'yes', 'yes'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a15', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a02', 'Smart Home Install', 'res-smart-home', 'Smart home device installation', 'Smart home installation', 80.00, 'custom', 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=400', true, 'residential', 'quote', 'no'),
  ('d0eebc99-0001-4ef8-bb6d-6bb9bd380a16', 'c0eebc99-0001-4ef8-bb6d-6bb9bd380a02', 'House Cleaning', 'res-house-cleaning', 'Professional house cleaning services', 'House cleaning', 200.00, 'fixed', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', true, 'residential', 'yes', 'no')
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, name = EXCLUDED.name, description = EXCLUDED.description,
  short_description = EXCLUDED.short_description, base_price = EXCLUDED.base_price,
  pricing_type = EXCLUDED.pricing_type, image_url = EXCLUDED.image_url, is_active = true,
  sales_channel = EXCLUDED.sales_channel, rate = EXCLUDED.rate, emergency = EXCLUDED.emergency;

-- Insert Commercial Services (no category_id — commercial has no categories)
INSERT INTO services (id, category_id, name, slug, description, short_description, base_price, pricing_type, image_url, is_active, sales_channel, rate, emergency) VALUES
  ('d0eebc99-0002-4ef8-bb6d-6bb9bd380a01', NULL, 'Concrete', 'com-concrete', 'Commercial concrete services', 'Commercial concrete', 0.00, 'custom', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400', true, 'commercial', 'quote', 'no'),
  ('d0eebc99-0002-4ef8-bb6d-6bb9bd380a02', NULL, 'Electrical', 'com-electrical', 'Commercial electrical services', 'Commercial electrical', 0.00, 'custom', 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=400', true, 'commercial', 'quote', 'no'),
  ('d0eebc99-0002-4ef8-bb6d-6bb9bd380a03', NULL, 'Plumbing', 'com-plumbing', 'Commercial plumbing services', 'Commercial plumbing', 0.00, 'custom', 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400', true, 'commercial', 'quote', 'no'),
  ('d0eebc99-0002-4ef8-bb6d-6bb9bd380a04', NULL, 'Painting', 'com-painting', 'Commercial painting services', 'Commercial painting', 0.00, 'custom', 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=400', true, 'commercial', 'quote', 'no'),
  ('d0eebc99-0002-4ef8-bb6d-6bb9bd380a05', NULL, 'Drywall & Mudding', 'com-drywall-mudding', 'Commercial drywall and mudding', 'Commercial drywall', 0.00, 'custom', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400', true, 'commercial', 'quote', 'no'),
  ('d0eebc99-0002-4ef8-bb6d-6bb9bd380a06', NULL, 'HVAC (Heating & Cooling)', 'com-hvac', 'Commercial HVAC services', 'Commercial HVAC', 0.00, 'custom', 'https://images.unsplash.com/photo-1635274531661-1c5a5e9b0d3d?q=80&w=400', true, 'commercial', 'quote', 'no'),
  ('d0eebc99-0002-4ef8-bb6d-6bb9bd380a07', NULL, 'Roofing', 'com-roofing', 'Commercial roofing services', 'Commercial roofing', 0.00, 'custom', 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?q=80&w=400', true, 'commercial', 'quote', 'no'),
  ('d0eebc99-0002-4ef8-bb6d-6bb9bd380a08', NULL, 'Windows & Doors', 'com-windows-doors', 'Commercial window and door services', 'Commercial windows & doors', 0.00, 'custom', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', true, 'commercial', 'quote', 'no'),
  ('d0eebc99-0002-4ef8-bb6d-6bb9bd380a09', NULL, 'Landscaping', 'com-landscaping', 'Commercial landscaping services', 'Commercial landscaping', 0.00, 'custom', 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', true, 'commercial', 'quote', 'no')
ON CONFLICT (slug) DO UPDATE SET
  category_id = EXCLUDED.category_id, name = EXCLUDED.name, description = EXCLUDED.description,
  short_description = EXCLUDED.short_description, base_price = EXCLUDED.base_price,
  pricing_type = EXCLUDED.pricing_type, image_url = EXCLUDED.image_url, is_active = true,
  sales_channel = EXCLUDED.sales_channel, rate = EXCLUDED.rate, emergency = EXCLUDED.emergency;
