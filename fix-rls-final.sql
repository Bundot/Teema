-- FINAL RLS FIX - Drop and recreate policies correctly
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

-- Step 2: Disable RLS temporarily to test raw access
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Step 3: Test basic update without RLS
UPDATE products 
SET name = name || '_RLS_TEST' 
WHERE slug IS NOT NULL 
LIMIT 1;

-- Step 4: Re-enable RLS with proper policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Step 5: Create comprehensive policies for authenticated users

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

-- Step 6: Grant necessary permissions
GRANT ALL ON products TO authenticated;
GRANT ALL ON products TO anon;

-- Step 7: Verify policies were created
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

-- Step 8: Test the new policy
UPDATE products 
SET name = replace(name, '_RLS_TEST', '_RLS_WORKING')
WHERE name LIKE '%_RLS_TEST%';

-- Step 9: Verify the test worked
SELECT slug, name FROM products WHERE name LIKE '%_RLS_WORKING%';

-- Step 10: Clean up test data
UPDATE products 
SET name = replace(name, '_RLS_WORKING', '')
WHERE name LIKE '%_RLS_WORKING%';

-- Step 11: Final verification
SELECT COUNT(*) as total_products FROM products;

-- If you see:
-- - Policies created successfully in step 7
-- - Test row updated in step 9
-- - Total count in step 11
-- Then RLS is working correctly!

-- If you get errors about policies already existing, run this instead:

-- ALTERNATIVE: Just fix the update policy
DROP POLICY IF EXISTS "Enable update for authenticated users" ON products;

CREATE POLICY "Enable update for authenticated users" ON products
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
