const { supabase, supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

// QA test accounts — only these emails can see QA Testing category/services
const QA_TEST_EMAILS = ['danafgaliver@gmail.com', 'zetthebloodedge@gmail.com', 'admin@bridgework.ca'];
const QA_CATEGORY_SLUG = 'qa-testing';

exports.getAllServices = async (req, res) => {
    try {
        const { category, search } = req.query;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;

        logger.info('[SERVICES] getAllServices called', { category, search, limit, offset });

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
            .eq('is_active', true);

        if (category) {
            query = query.eq('category_id', category);
        }

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        query = query
            .order('name')
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        logger.info('[SERVICES] getAllServices result', { count: data?.length, error: error?.message });

        if (error) {
            logger.error('Get services error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch services'
            });
        }

        // Filter out QA services for non-test users
        const userEmail = req.profile?.email;
        const isQAUser = userEmail && QA_TEST_EMAILS.includes(userEmail);
        const filteredData = isQAUser ? data : data.filter(s => s.service_categories?.slug !== QA_CATEGORY_SLUG);

        res.json({
            success: true,
            data: {
                services: filteredData,
                pagination: {
                    limit,
                    offset,
                    total: count
                }
            }
        });
    } catch (error) {
        logger.error('Get services controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch services'
        });
    }
};

exports.getServiceById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('services')
            .select(`
                *,
                service_categories (
                    id,
                    name,
                    slug,
                    description
                )
            `)
            .eq('id', id)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        res.json({
            success: true,
            data: { service: data }
        });
    } catch (error) {
        logger.error('Get service by ID error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch service'
        });
    }
};

exports.searchServices = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        const { data, error } = await supabaseAdmin
            .from('services')
            .select('id, name, slug, short_description, base_price, service_categories(slug)')
            .or(`name.ilike.%${q}%,description.ilike.%${q}%,tags.cs.{${q}}`)
            .eq('is_active', true)
            .limit(10);

        if (error) {
            logger.error('Search services error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Search failed'
            });
        }

        // Filter out QA services for non-test users
        const userEmail = req.profile?.email;
        const isQAUser = userEmail && QA_TEST_EMAILS.includes(userEmail);
        const filteredData = isQAUser ? data : data.filter(s => s.service_categories?.slug !== QA_CATEGORY_SLUG);

        res.json({
            success: true,
            data: { results: filteredData }
        });
    } catch (error) {
        logger.error('Search services controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('service_categories')
            .select('*')
            .eq('is_active', true)
            .order('display_order');

        if (error) {
            logger.error('Get categories error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch categories'
            });
        }

        // Filter out QA Testing category for non-test users
        const userEmail = req.profile?.email;
        const isQAUser = userEmail && QA_TEST_EMAILS.includes(userEmail);
        const filteredData = isQAUser ? data : data.filter(c => c.slug !== QA_CATEGORY_SLUG);

        res.json({
            success: true,
            data: { categories: filteredData }
        });
    } catch (error) {
        logger.error('Get categories controller error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
};

exports.getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('service_categories')
            .select(`
                *,
                services (
                    id,
                    name,
                    slug,
                    short_description,
                    base_price,
                    is_active
                )
            `)
            .eq('id', id)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        data.services = data.services.filter(s => s.is_active);

        res.json({
            success: true,
            data: { category: data }
        });
    } catch (error) {
        logger.error('Get category by ID error', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch category'
        });
    }
};

exports.createService = async (req, res) => {
    try {
        const {
            category_id,
            name,
            slug,
            description,
            short_description,
            base_price,
            pricing_type,
            estimated_duration,
            tags
        } = req.body;

        const { data, error } = await supabaseAdmin
            .from('services')
            .insert({
                category_id,
                name,
                slug,
                description,
                short_description,
                base_price,
                pricing_type,
                estimated_duration,
                tags
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

        logger.info('Service created', { serviceId: data.id });

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

exports.updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

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

exports.deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('services')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            logger.error('Delete service error', { error: error.message });
            return res.status(500).json({
                success: false,
                message: 'Failed to delete service'
            });
        }

        logger.info('Service deleted', { serviceId: id });

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
