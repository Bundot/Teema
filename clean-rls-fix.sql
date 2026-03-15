-- CLEAN RLS FIX - Remove conflicting policies and create single comprehensive policy
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL existing policies to eliminate conflicts
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON products;
DROP POLICY IF EXISTS "editor_full_access" ON products;
DROP POLICY IF EXISTS "public_select_products" ON products;

-- Step 2: Verify all policies are dropped
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'products'
ORDER BY policyname;

-- Step 3: Create single comprehensive policy for authenticated users
-- This one policy handles ALL CRUD operations
CREATE POLICY "Users can manage products" ON products
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Step 4: Create separate policy for public read access
CREATE POLICY "Public can read products" ON products
    FOR SELECT 
    USING (true);

-- Step 5: Verify new policies were created
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

-- Step 6: Test the new policy
UPDATE products 
SET name = name || '_CLEAN_TEST'
WHERE slug IS NOT NULL
LIMIT 1;

-- Step 7: Verify test worked
SELECT slug, name FROM products WHERE name LIKE '%_CLEAN_TEST%';

-- Step 8: Clean up test data
UPDATE products 
SET name = replace(name, '_CLEAN_TEST', '')
WHERE name LIKE '%_CLEAN_TEST%';

-- Step 9: Final verification
SELECT COUNT(*) as total_products FROM products;

-- Expected results:
-- Step 3 should show NO policies
-- Step 5 should show 2 policies: "Users can manage products" and "Public can read products"
-- Step 7 should show 1 row with _CLEAN_TEST suffix
-- Step 9 should show 58 products
-- If all these conditions are met, RLS is fixed!
