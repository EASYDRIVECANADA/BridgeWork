const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const { writeAuditLog } = require('../services/auditService');

// Configure multer with memory storage for Supabase Storage uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
        }
    }
});

// ============================================================================
// CATEGORY MANAGEMENT
// ============================================================================

// Get all categories (including inactive for admin)
exports.getAllCategories = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { sales_channel } = req.query;

        let query = supabaseAdmin
            .from('service_categories')
            .select('*')
            .order('display_order');

        if (sales_channel) {
            query = query.eq('sales_channel', sales_channel);
        }

        const { data, error } = await query;

        if (error) {
            logger.error('Get all categories error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch categories'
            });
        }

        res.json({
            success: true,
            data: { categories: data }
        });
    } catch (error) {
        logger.error('Get all categories controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
};

// Create category
exports.createCategory = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { name, slug, description, icon_url, image_url, display_order } = req.body;

        // Check if slug already exists
        const { data: existing } = await supabaseAdmin
            .from('service_categories')
            .select('id')
            .eq('slug', slug)
            .single();

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A category with this slug already exists'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('service_categories')
            .insert({
                name,
                slug,
                description,
                icon_url,
                image_url,
                display_order: display_order || 0,
                is_active: true,
                sales_channel: 'residential'
            })
            .select()
            .single();

        if (error) {
            logger.error('Create category error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to create category'
            });
        }

        logger.info('Category created', { categoryId: data.id, name });

        await writeAuditLog(req.profile.id, 'create_category', 'category', data.id, { name, slug });

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: { category: data }
        });
    } catch (error) {
        logger.error('Create category controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to create category'
        });
    }
};

// Update category
exports.updateCategory = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { id } = req.params;
        const updates = req.body;

        // If slug is being updated, check for conflicts
        if (updates.slug) {
            const { data: existing } = await supabaseAdmin
                .from('service_categories')
                .select('id')
                .eq('slug', updates.slug)
                .neq('id', id)
                .single();

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'A category with this slug already exists'
                });
            }
        }

        const { data, error } = await supabaseAdmin
            .from('service_categories')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error('Update category error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to update category'
            });
        }

        logger.info('Category updated', { categoryId: id });

        await writeAuditLog(req.profile.id, 'update_category', 'category', id, { fields: Object.keys(updates) });

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: { category: data }
        });
    } catch (error) {
        logger.error('Update category controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to update category'
        });
    }
};

// Delete category (hard delete — only if zero services)
exports.deleteCategory = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { id } = req.params;

        // Check if category has ANY services (active or inactive)
        const { data: services } = await supabaseAdmin
            .from('services')
            .select('id')
            .eq('category_id', id);

        if (services && services.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category with ${services.length} service(s). Remove or reassign all services first.`
            });
        }

        const { error } = await supabaseAdmin
            .from('service_categories')
            .delete()
            .eq('id', id);

        if (error) {
            logger.error('Delete category error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to delete category'
            });
        }

        logger.info('Category permanently deleted', { categoryId: id });

        await writeAuditLog(req.profile.id, 'delete_category', 'category', id);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        logger.error('Delete category controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to delete category'
        });
    }
};

// ============================================================================
// SERVICE MANAGEMENT
// ============================================================================

// Get all services (including inactive for admin)
exports.getAllServicesAdmin = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { category_id, sales_channel } = req.query;

        let query = supabaseAdmin
            .from('services')
            .select(`
                *,
                service_categories (
                    id,
                    name,
                    slug
                )
            `)
            .order('name');

        if (sales_channel) {
            query = query.eq('sales_channel', sales_channel);
        }
        if (category_id) {
            query = query.eq('category_id', category_id);
        }

        const { data, error } = await query;

        if (error) {
            logger.error('Get all services admin error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch services'
            });
        }

        res.json({
            success: true,
            data: { services: data }
        });
    } catch (error) {
        logger.error('Get all services admin controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services'
        });
    }
};

// Create service
exports.createService = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const {
            category_id,
            name,
            slug,
            description,
            short_description,
            base_price,
            pricing_type,
            estimated_duration,
            additional_hourly_rate,
            image_url,
            tags,
            sales_channel,
            rate,
            emergency,
            emergency_base_price,
            emergency_pricing_type,
            use_cases
        } = req.body;

        // Check if slug already exists
        const { data: existing } = await supabaseAdmin
            .from('services')
            .select('id')
            .eq('slug', slug)
            .single();

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A service with this slug already exists'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('services')
            .insert({
                category_id: category_id || null,
                name,
                slug,
                description,
                short_description,
                base_price: base_price ? parseFloat(base_price) : 0,
                pricing_type: pricing_type || 'custom',
                estimated_duration: estimated_duration ? parseInt(estimated_duration) : null,
                additional_hourly_rate: additional_hourly_rate ? parseFloat(additional_hourly_rate) : null,
                image_url,
                tags: tags || [],
                is_active: true,
                sales_channel: sales_channel || 'residential',
                rate: rate || 'quote',
                emergency: emergency || 'no',
                emergency_base_price: emergency_base_price ? parseFloat(emergency_base_price) : null,
                emergency_pricing_type: emergency_pricing_type || 'hourly',
                use_cases: use_cases || []
            })
            .select()
            .single();

        if (error) {
            logger.error('Create service error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to create service'
            });
        }

        logger.info('Service created', { serviceId: data.id, name });

        await writeAuditLog(req.profile.id, 'create_service', 'service', data.id, { name, slug, pricing_type });

        res.status(201).json({
            success: true,
            message: 'Service created successfully',
            data: { service: data }
        });
    } catch (error) {
        logger.error('Create service controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to create service'
        });
    }
};

// Update service
exports.updateService = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { id } = req.params;
        const updates = { ...req.body };

        // Convert numeric fields — empty strings must become null for integer columns
        if ('base_price' in updates) {
            updates.base_price = updates.base_price !== '' && updates.base_price != null
                ? parseFloat(updates.base_price) : 0;
        }
        if ('estimated_duration' in updates) {
            updates.estimated_duration = updates.estimated_duration !== '' && updates.estimated_duration != null
                ? parseInt(updates.estimated_duration) : null;
        }
        if ('additional_hourly_rate' in updates) {
            updates.additional_hourly_rate = updates.additional_hourly_rate !== '' && updates.additional_hourly_rate != null
                ? parseFloat(updates.additional_hourly_rate) : null;
        }
        if ('emergency_base_price' in updates) {
            updates.emergency_base_price = updates.emergency_base_price !== '' && updates.emergency_base_price != null
                ? parseFloat(updates.emergency_base_price) : null;
        }

        // If slug is being updated, check for conflicts
        if (updates.slug) {
            const { data: existing } = await supabaseAdmin
                .from('services')
                .select('id')
                .eq('slug', updates.slug)
                .neq('id', id)
                .single();

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'A service with this slug already exists'
                });
            }
        }

        const { data, error } = await supabaseAdmin
            .from('services')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error('Update service error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to update service'
            });
        }

        logger.info('Service updated', { serviceId: id });

        await writeAuditLog(req.profile.id, 'update_service', 'service', id, { fields: Object.keys(updates) });

        res.json({
            success: true,
            message: 'Service updated successfully',
            data: { service: data }
        });
    } catch (error) {
        logger.error('Update service controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to update service'
        });
    }
};

// Delete service (hard delete)
exports.deleteService = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('services')
            .delete()
            .eq('id', id);

        if (error) {
            logger.error('Delete service error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to delete service'
            });
        }

        logger.info('Service permanently deleted', { serviceId: id });

        await writeAuditLog(req.profile.id, 'delete_service', 'service', id);

        res.json({
            success: true,
            message: 'Service deleted successfully'
        });
    } catch (error) {
        logger.error('Delete service controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to delete service'
        });
    }
};

// ============================================================================
// IMAGE UPLOAD
// ============================================================================

// Upload image for service or category — uploads to Supabase Storage
exports.uploadImage = async (req, res) => {
    try {
        if (req.profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const { entity_type, entity_id } = req.body;

        if (!entity_type || !entity_id) {
            return res.status(400).json({
                success: false,
                message: 'entity_type and entity_id are required'
            });
        }

        if (!['service', 'category'].includes(entity_type)) {
            return res.status(400).json({
                success: false,
                message: 'entity_type must be either "service" or "category"'
            });
        }

        const BUCKET = 'service-images';

        // Ensure the bucket exists
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === BUCKET);
        if (!bucketExists) {
            await supabaseAdmin.storage.createBucket(BUCKET, {
                public: true,
                fileSizeLimit: 5 * 1024 * 1024,
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            });
            logger.info(`Created "${BUCKET}" storage bucket`);
        }

        // Build a unique file path inside the bucket
        const fileExt = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const fileName = `${entity_type}/${entity_id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}${fileExt}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) {
            logger.error('Supabase Storage upload error', { error: uploadError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to upload image to storage'
            });
        }

        // Get the public URL
        const { data: urlData } = supabaseAdmin.storage
            .from(BUCKET)
            .getPublicUrl(fileName);

        const imageUrl = urlData.publicUrl;

        // Update the entity's image_url in the database
        const table = entity_type === 'service' ? 'services' : 'service_categories';
        const { error: updateError } = await supabaseAdmin
            .from(table)
            .update({ image_url: imageUrl })
            .eq('id', entity_id);

        if (updateError) {
            logger.error('Update entity image_url error', { error: updateError.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to update image URL'
            });
        }

        logger.info('Image uploaded to Supabase Storage', {
            entity_type,
            entity_id,
            fileName,
            imageUrl
        });

        res.json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                image_url: imageUrl,
                file_name: req.file.originalname,
                file_size: req.file.size
            }
        });
    } catch (error) {
        logger.error('Upload image controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to upload image'
        });
    }
};

// Export multer upload middleware
exports.uploadMiddleware = upload.single('image');
