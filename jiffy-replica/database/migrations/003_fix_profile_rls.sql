-- Fix RLS policy to allow users to always view their own profile
-- This ensures users can see their profile data even if is_active is false

-- Add policy for users to view their own profile
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);
