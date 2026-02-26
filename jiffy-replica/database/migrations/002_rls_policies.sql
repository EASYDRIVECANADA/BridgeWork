-- Jiffy On Demand Replica - Row Level Security Policies
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE pro_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can view all active profiles (for finding pros, etc.)
CREATE POLICY "Public profiles are viewable by authenticated users"
    ON profiles FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Users can insert their own profile on signup
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- SERVICE CATEGORIES POLICIES
-- ============================================================================

-- Anyone can view active service categories
CREATE POLICY "Service categories are viewable by everyone"
    ON service_categories FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Only admins can manage service categories
CREATE POLICY "Admins can manage service categories"
    ON service_categories FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- SERVICES POLICIES
-- ============================================================================

-- Anyone can view active services
CREATE POLICY "Services are viewable by everyone"
    ON services FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Only admins can manage services
CREATE POLICY "Admins can manage services"
    ON services FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- PRO APPLICATIONS POLICIES
-- ============================================================================

-- Users can view their own applications
CREATE POLICY "Users can view their own pro applications"
    ON pro_applications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can create their own applications
CREATE POLICY "Users can create pro applications"
    ON pro_applications FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their pending applications
CREATE POLICY "Users can update their pending applications"
    ON pro_applications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'pending')
    WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Admins can view all applications
CREATE POLICY "Admins can view all pro applications"
    ON pro_applications FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update any application
CREATE POLICY "Admins can update pro applications"
    ON pro_applications FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- PRO PROFILES POLICIES
-- ============================================================================

-- Anyone can view active pro profiles
CREATE POLICY "Pro profiles are viewable by everyone"
    ON pro_profiles FOR SELECT
    TO authenticated
    USING (true);

-- Pros can update their own profile
CREATE POLICY "Pros can update their own profile"
    ON pro_profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins can manage all pro profiles
CREATE POLICY "Admins can manage pro profiles"
    ON pro_profiles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- BOOKINGS POLICIES
-- ============================================================================

-- Users can view their own bookings
CREATE POLICY "Users can view their own bookings"
    ON bookings FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Pros can view bookings assigned to them
CREATE POLICY "Pros can view their assigned bookings"
    ON bookings FOR SELECT
    TO authenticated
    USING (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    );

-- Users can create bookings
CREATE POLICY "Users can create bookings"
    ON bookings FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own pending/accepted bookings
CREATE POLICY "Users can update their own bookings"
    ON bookings FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid() 
        AND status IN ('pending', 'accepted')
    )
    WITH CHECK (user_id = auth.uid());

-- Pros can update their assigned bookings
CREATE POLICY "Pros can update their assigned bookings"
    ON bookings FOR UPDATE
    TO authenticated
    USING (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    );

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
    ON bookings FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update any booking
CREATE POLICY "Admins can update any booking"
    ON bookings FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- REVIEWS POLICIES
-- ============================================================================

-- Anyone can view reviews
CREATE POLICY "Reviews are viewable by everyone"
    ON reviews FOR SELECT
    TO authenticated
    USING (true);

-- Users can create reviews for their completed bookings
CREATE POLICY "Users can create reviews for their bookings"
    ON reviews FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM bookings
            WHERE id = booking_id
            AND user_id = auth.uid()
            AND status = 'completed'
        )
    );

-- Pros can respond to their reviews
CREATE POLICY "Pros can update responses to their reviews"
    ON reviews FOR UPDATE
    TO authenticated
    USING (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    );

-- Admins can manage reviews
CREATE POLICY "Admins can manage reviews"
    ON reviews FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view their own messages"
    ON messages FOR SELECT
    TO authenticated
    USING (
        sender_id = auth.uid() 
        OR recipient_id = auth.uid()
    );

-- Users can send messages in their bookings
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND (
            EXISTS (
                SELECT 1 FROM bookings
                WHERE id = booking_id
                AND (user_id = auth.uid() OR pro_id IN (
                    SELECT id FROM pro_profiles WHERE user_id = auth.uid()
                ))
            )
        )
    );

-- Users can mark their received messages as read
CREATE POLICY "Users can update received messages"
    ON messages FOR UPDATE
    TO authenticated
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- System can create notifications (handled by backend service role)
CREATE POLICY "Service role can create notifications"
    ON notifications FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TRANSACTIONS POLICIES
-- ============================================================================

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
    ON transactions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Pros can view their transactions
CREATE POLICY "Pros can view their transactions"
    ON transactions FOR SELECT
    TO authenticated
    USING (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    );

-- Only service role can create/update transactions
CREATE POLICY "Service role can manage transactions"
    ON transactions FOR ALL
    TO service_role
    USING (true);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions"
    ON transactions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- PRO AVAILABILITY POLICIES
-- ============================================================================

-- Anyone can view pro availability
CREATE POLICY "Pro availability is viewable by everyone"
    ON pro_availability FOR SELECT
    TO authenticated
    USING (true);

-- Pros can manage their own availability
CREATE POLICY "Pros can manage their own availability"
    ON pro_availability FOR ALL
    TO authenticated
    USING (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- PRO TIME OFF POLICIES
-- ============================================================================

-- Pros can view their own time off
CREATE POLICY "Pros can view their own time off"
    ON pro_time_off FOR SELECT
    TO authenticated
    USING (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    );

-- Pros can manage their own time off
CREATE POLICY "Pros can manage their own time off"
    ON pro_time_off FOR ALL
    TO authenticated
    USING (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        pro_id IN (
            SELECT id FROM pro_profiles WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- SAVED ADDRESSES POLICIES
-- ============================================================================

-- Users can view their own saved addresses
CREATE POLICY "Users can view their own saved addresses"
    ON saved_addresses FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can manage their own saved addresses
CREATE POLICY "Users can manage their own saved addresses"
    ON saved_addresses FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FAVORITES POLICIES
-- ============================================================================

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
    ON favorites FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can manage their own favorites
CREATE POLICY "Users can manage their own favorites"
    ON favorites FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PROMO CODES POLICIES
-- ============================================================================

-- Users can view active promo codes
CREATE POLICY "Users can view active promo codes"
    ON promo_codes FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Admins can manage promo codes
CREATE POLICY "Admins can manage promo codes"
    ON promo_codes FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- SUPPORT TICKETS POLICIES
-- ============================================================================

-- Users can view their own support tickets
CREATE POLICY "Users can view their own support tickets"
    ON support_tickets FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can create support tickets
CREATE POLICY "Users can create support tickets"
    ON support_tickets FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Admins can view all support tickets
CREATE POLICY "Admins can view all support tickets"
    ON support_tickets FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can manage all support tickets
CREATE POLICY "Admins can manage support tickets"
    ON support_tickets FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- STORAGE POLICIES (for Supabase Storage)
-- ============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
    ('avatars', 'avatars', true),
    ('service-images', 'service-images', true),
    ('booking-images', 'booking-images', false),
    ('pro-documents', 'pro-documents', false),
    ('pro-portfolio', 'pro-portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Avatar storage policies
CREATE POLICY "Avatar images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Service images storage policies
CREATE POLICY "Service images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'service-images');

CREATE POLICY "Admins can upload service images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'service-images'
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Booking images storage policies
CREATE POLICY "Users can view their booking images"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'booking-images'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

CREATE POLICY "Users can upload booking images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'booking-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Pro documents storage policies
CREATE POLICY "Pros can view their documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'pro-documents'
        AND (
            auth.uid()::text = (storage.foldername(name))[1]
            OR EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

CREATE POLICY "Pros can upload their documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'pro-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Pro portfolio storage policies
CREATE POLICY "Pro portfolio images are publicly accessible"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'pro-portfolio');

CREATE POLICY "Pros can upload portfolio images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'pro-portfolio'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Pros can delete their portfolio images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'pro-portfolio'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
