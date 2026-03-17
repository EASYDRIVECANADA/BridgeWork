const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

exports.findNearbyPros = async (latitude, longitude, categoryId, radiusMiles = 25) => {
    try {
        const radiusMeters = radiusMiles * 1609.34;

        const { data, error } = await supabaseAdmin.rpc('find_nearby_pros', {
            p_lat: latitude,
            p_lon: longitude,
            p_radius_meters: radiusMeters,
            p_category_id: categoryId
        });

        if (error) {
            logger.error('Find nearby pros error', { error: error.message });
            return [];
        }

        return data || [];
    } catch (error) {
        logger.error('Find nearby pros service error', { error: error.message });
        return [];
    }
};

exports.matchProToBooking = async (bookingId) => {
    try {
        const { data: booking } = await supabaseAdmin
            .from('bookings')
            .select('*, services(category_id)')
            .eq('id', bookingId)
            .single();

        if (!booking) {
            return null;
        }

        const nearbyPros = await this.findNearbyPros(
            booking.latitude,
            booking.longitude,
            booking.services.category_id
        );

        const sortedPros = nearbyPros.sort((a, b) => {
            const scoreA = calculateProScore(a);
            const scoreB = calculateProScore(b);
            return scoreB - scoreA;
        });

        return sortedPros[0] || null;
    } catch (error) {
        logger.error('Match pro to booking error', { error: error.message });
        return null;
    }
};

function calculateProScore(pro) {
    const ratingWeight = 0.4;
    const reviewsWeight = 0.2;
    const completionRateWeight = 0.3;
    const responseTimeWeight = 0.1;

    const ratingScore = (pro.rating / 5) * ratingWeight;
    const reviewsScore = Math.min(pro.total_reviews / 100, 1) * reviewsWeight;
    const completionRate = pro.completed_jobs / Math.max(pro.total_jobs, 1);
    const completionScore = completionRate * completionRateWeight;
    const responseScore = (1 - Math.min(pro.response_time / 60, 1)) * responseTimeWeight;

    return ratingScore + reviewsScore + completionScore + responseScore;
}
