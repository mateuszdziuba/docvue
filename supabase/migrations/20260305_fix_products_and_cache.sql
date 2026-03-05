-- 1. FIX THE BEAUTY PLAN PRODUCTS TABLE (Missing columns)
-- If the table existed from before but lacked image_url and usage_description
ALTER TABLE beauty_plan_products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE beauty_plan_products ADD COLUMN IF NOT EXISTS usage_description TEXT;
ALTER TABLE beauty_plan_products ADD COLUMN IF NOT EXISTS url TEXT;

-- 2. CREATE PRODUCT CACHE TABLE FOR FASTER SCRAPING
CREATE TABLE IF NOT EXISTS scraped_products_cache (
    url TEXT PRIMARY KEY,
    name TEXT,
    price NUMERIC(10, 2),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Allow backend service role / authenticated users to read from the cache
ALTER TABLE scraped_products_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read scraped products cache" ON scraped_products_cache;
CREATE POLICY "Anyone can read scraped products cache" 
ON scraped_products_cache FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert scraped products" ON scraped_products_cache;
CREATE POLICY "Authenticated users can insert scraped products" 
ON scraped_products_cache FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update scraped products" ON scraped_products_cache;
CREATE POLICY "Authenticated users can update scraped products" 
ON scraped_products_cache FOR UPDATE 
USING (auth.role() = 'authenticated');

-- 3. FIX POLICIES FOR BEAUTY PLANS (From previous instruction)
-- Allow salon owners to delete products
DROP POLICY IF EXISTS "Users can insert beauty plan products for their salon's clients" ON beauty_plan_products;
CREATE POLICY "Users can insert beauty plan products for their salon's clients" 
ON beauty_plan_products FOR INSERT 
WITH CHECK (
  plan_id IN (
    SELECT id FROM beauty_plans WHERE salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can delete beauty plan products of their salon's clients" ON beauty_plan_products;
CREATE POLICY "Users can delete beauty plan products of their salon's clients" 
ON beauty_plan_products FOR DELETE 
USING (
  plan_id IN (
    SELECT id FROM beauty_plans WHERE salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  )
);

-- Fix public sharing view
DROP POLICY IF EXISTS "Anyone can view a beauty plan if they have the ID" ON beauty_plans;
CREATE POLICY "Anyone can view a beauty plan if they have the ID"
ON beauty_plans FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view beauty plan products if they have the plan ID" ON beauty_plan_products;
CREATE POLICY "Anyone can view beauty plan products if they have the plan ID"
ON beauty_plan_products FOR SELECT
USING (true);
