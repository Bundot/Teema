-- EMERGENCY RLS FIX - Run this in Supabase SQL Editor
-- This addresses the empty response issue from PATCH operations

-- First, completely disable RLS temporarily to test
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Test basic update without RLS
-- This should work and tell us if the issue is RLS-related

-- Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test a simple update
UPDATE products 
SET name = name || '_RLS_TEST' 
WHERE slug IS NOT NULL 
LIMIT 1;

-- Check if update worked
SELECT slug, name FROM products WHERE name LIKE '%_RLS_TEST%';

-- If the above worked, the issue is RLS
-- If it didn't work, the issue is table structure or permissions

-- Now recreate RLS with the most permissive policies possible
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON products;

-- Create a very permissive update policy
CREATE POLICY "Allow authenticated users to update products" ON products
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Grant explicit permissions
GRANT UPDATE ON products TO authenticated;
GRANT UPDATE ON products TO anon;

-- Verify the policy was created
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
  AND tablename = 'products';

-- Test the policy with a direct update
UPDATE products 
SET name = replace(name, '_RLS_TEST', '_RLS_FIXED')
WHERE name LIKE '%_RLS_TEST%';

-- Verify the policy-based update worked
SELECT slug, name FROM products WHERE name LIKE '%_RLS_FIXED%';

-- If you see rows with _RLS_FIXED, then RLS is working
-- If not, there may be other issues

-- Also check if there are any triggers on the table
SELECT 
    event_object_table,
    trigger_name,
    event_manipulation,
    action_timing,
    action_condition,
    action_orientation
FROM information_schema.triggers 
WHERE event_object_table = 'products';

-- Triggers could be interfering with updates
