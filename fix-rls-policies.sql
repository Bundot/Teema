-- Fix RLS Policies for Teema Admin Dashboard
-- Run these SQL commands in your Supabase SQL Editor

-- 1. First, disable RLS temporarily to clear conflicts
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (including duplicates)
DROP POLICY IF EXISTS "Allow authenticated users to manage products" ON products;
DROP POLICY IF EXISTS "Allow public read access" ON products;
DROP POLICY IF EXISTS "Users can view all products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

-- 3. Create clean, non-conflicting policies
-- Allow public read access (for storefront)
CREATE POLICY "Enable read access for all users" ON products
    FOR SELECT USING (true);

-- Allow authenticated users full CRUD access
CREATE POLICY "Enable insert for authenticated users" ON products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON products
    FOR UPDATE USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON products
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Re-enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 5. Grant necessary permissions
GRANT ALL ON products TO authenticated;
GRANT SELECT ON products TO anon;

-- 6. Also fix combos table if it exists
ALTER TABLE combos DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all combos" ON combos;
DROP POLICY IF EXISTS "Users can insert combos" ON combos;
DROP POLICY IF EXISTS "Users can update combos" ON combos;
DROP POLICY IF EXISTS "Users can delete combos" ON combos;

CREATE POLICY "Allow authenticated users to read combos" ON combos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert combos" ON combos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update combos" ON combos
    FOR UPDATE USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete combos" ON combos
    FOR DELETE USING (auth.role() = 'authenticated');

ALTER TABLE combos ENABLE ROW LEVEL SECURITY;

GRANT ALL ON combos TO authenticated;
GRANT ALL ON combos TO anon;

-- 7. Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename IN ('products', 'combos');

-- 8. Test the current user's permissions
SELECT 
    current_user as authenticated_user,
    auth.role() as current_role,
    auth.uid() as current_uid;
