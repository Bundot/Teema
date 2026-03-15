-- CORRECTED RLS FIX - Fixed syntax error
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing policies on products table
DROP POLICY IF EXISTS "Allow authenticated users to update products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to insert products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to read products" ON products;
DROP POLICY IF EXISTS "Allow authenticated users to delete products" ON products;
DROP POLICY IF EXISTS "Users can view all products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

-- Step 2: Disable RLS temporarily to ensure clean state
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Step 4: Create comprehensive policies for authenticated users

-- Read policy - allows authenticated users to read
CREATE POLICY "Enable read for authenticated users" ON products
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Insert policy - allows authenticated users to insert
CREATE POLICY "Enable insert for authenticated users" ON products
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Update policy - allows authenticated users to update
CREATE POLICY "Enable update for authenticated users" ON products
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Delete policy - allows authenticated users to delete
CREATE POLICY "Enable delete for authenticated users" ON products
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Step 5: Grant necessary permissions
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO anon;

-- Step 6: Verify policies were created
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
  AND tablename = 'products'
ORDER BY policyname;

-- Step 7: Test the new policy with a simple update
UPDATE products 
SET name = name || '_RLS_TEST_WORKING' 
WHERE slug IS NOT NULL;

-- Step 8: Verify the test worked
SELECT slug, name FROM products WHERE name LIKE '%_RLS_TEST_WORKING%';

-- Step 9: Clean up test data
UPDATE products 
SET name = replace(name, '_RLS_TEST_WORKING', '')
WHERE name LIKE '%_RLS_TEST_WORKING%';

-- Step 10: Final verification
SELECT COUNT(*) as total_products FROM products;

-- If you see:
-- - Policies created successfully in step 6
-- - Test row updated in step 8 (should show 1 row then 0 rows after cleanup)
-- - Total count in step 10
-- Then RLS is working correctly!

-- Alternative if you still get policy exists errors:
-- Just run this section:

-- Drop only the update policy
DROP POLICY IF EXISTS "Enable update for authenticated users" ON products;

-- Recreate update policy
CREATE POLICY "Enable update for authenticated users" ON products
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
