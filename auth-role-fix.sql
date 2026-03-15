-- AUTH ROLE FIX - Fix auth.role() issue in RLS policies
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON products;
DROP POLICY IF EXISTS "Allow public read access" ON products;

-- Step 2: Test what auth.role() returns for your session
SELECT 
    auth.uid() as user_id,
    auth.role() as user_role,
    auth.jwt() ->> 'role' as jwt_role;

-- Step 3: Create policies using auth.uid() instead of auth.role()
CREATE POLICY "Allow authenticated users to manage products" ON products
    FOR ALL 
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Step 4: Create separate policy for public read access
CREATE POLICY "Allow public read access" ON products
    FOR SELECT 
    USING (true);

-- Step 5: Verify new policies
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
SET name = name || '_AUTH_TEST'
WHERE slug IS NOT NULL;

-- Step 7: Verify test worked
SELECT slug, name FROM products WHERE name LIKE '%_AUTH_TEST%';

-- Step 8: Clean up test data
UPDATE products 
SET name = replace(name, '_AUTH_TEST', '')
WHERE name LIKE '%_AUTH_TEST%';

-- Step 9: Final verification
SELECT COUNT(*) as total_products FROM products;

-- Expected results:
-- Step 2: Should show your user_id and role information
-- Step 5: 2 policies created successfully
-- Step 7: Rows with _AUTH_TEST suffix
-- Step 9: 58 total products
-- If all these conditions are met, RLS is fixed!
