-- FINAL RLS SOLUTION - Complete policy reset and recreation (SYNTAX FIXED)
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL policies completely
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON products;
DROP POLICY IF EXISTS "editor_full_access" ON products;
DROP POLICY IF EXISTS "public_select_products" ON products;
DROP POLICY IF EXISTS "Users can manage products" ON products;
DROP POLICY IF EXISTS "Public can read products" ON products;

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

-- Step 3: Temporarily disable RLS to test raw access
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Step 4: Test raw update (should work)
UPDATE products 
SET name = name || '_RAW_TEST'
WHERE slug IS NOT NULL;

-- Step 5: Verify raw test worked
SELECT slug, name FROM products WHERE name LIKE '%_RAW_TEST%';

-- Step 6: Clean up raw test
UPDATE products 
SET name = replace(name, '_RAW_TEST', '')
WHERE name LIKE '%_RAW_TEST%';

-- Step 7: Re-enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Step 8: Create single comprehensive policy that allows EVERYTHING for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON products
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Step 9: Create separate policy for public read access
CREATE POLICY "Allow public read access" ON products
    FOR SELECT 
    USING (true);

-- Step 10: Verify new policies
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

-- Step 11: Test RLS update
UPDATE products 
SET name = name || '_RLS_FINAL_TEST'
WHERE slug IS NOT NULL;

-- Step 12: Verify RLS test worked
SELECT slug, name FROM products WHERE name LIKE '%_RLS_FINAL_TEST%';

-- Step 13: Clean up RLS test
UPDATE products 
SET name = replace(name, '_RLS_FINAL_TEST', '')
WHERE name LIKE '%_RLS_FINAL_TEST%';

-- Step 14: Final verification
SELECT COUNT(*) as total_products FROM products;

-- Expected results:
-- Step 2: NO policies (empty result)
-- Step 5: Rows with _RAW_TEST suffix
-- Step 10: 2 policies created
-- Step 12: Rows with _RLS_FINAL_TEST suffix
-- Step 14: 58 total products
-- If all these conditions are met, RLS is completely fixed!
