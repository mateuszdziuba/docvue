-- Create beauty_plans table
CREATE TABLE IF NOT EXISTS beauty_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
    morning_description TEXT,
    evening_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(client_id)
);

-- Create beauty_plan_products table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_time_of_day') THEN
        CREATE TYPE product_time_of_day AS ENUM ('morning', 'evening');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS beauty_plan_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id UUID REFERENCES beauty_plans(id) ON DELETE CASCADE NOT NULL,
    time_of_day product_time_of_day NOT NULL,
    name TEXT NOT NULL,
    url TEXT,
    image_url TEXT,
    price NUMERIC(10, 2),
    usage_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure newly added columns exist if the table was already there
ALTER TABLE beauty_plan_products ADD COLUMN IF NOT EXISTS usage_description TEXT;

-- Set up Row Level Security (RLS) for beauty_plans
ALTER TABLE beauty_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view beauty plans of their salon's clients" ON beauty_plans;
CREATE POLICY "Users can view beauty plans of their salon's clients" 
ON beauty_plans FOR SELECT 
USING (
  salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert beauty plans for their salon's clients" ON beauty_plans;
CREATE POLICY "Users can insert beauty plans for their salon's clients" 
ON beauty_plans FOR INSERT 
WITH CHECK (
  salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update beauty plans of their salon's clients" ON beauty_plans;
CREATE POLICY "Users can update beauty plans of their salon's clients" 
ON beauty_plans FOR UPDATE 
USING (
  salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete beauty plans of their salon's clients" ON beauty_plans;
CREATE POLICY "Users can delete beauty plans of their salon's clients" 
ON beauty_plans FOR DELETE 
USING (
  salon_id IN (
    SELECT id FROM salons WHERE user_id = auth.uid()
  )
);

-- Set up Row Level Security (RLS) for beauty_plan_products
ALTER TABLE beauty_plan_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view beauty plan products of their salon's clients" ON beauty_plan_products;
CREATE POLICY "Users can view beauty plan products of their salon's clients" 
ON beauty_plan_products FOR SELECT 
USING (
  plan_id IN (
    SELECT id FROM beauty_plans WHERE salon_id IN (
      SELECT id FROM salons WHERE user_id = auth.uid()
    )
  )
);

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

DROP POLICY IF EXISTS "Users can update beauty plan products of their salon's clients" ON beauty_plan_products;
CREATE POLICY "Users can update beauty plan products of their salon's clients" 
ON beauty_plan_products FOR UPDATE 
USING (
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

-- Trigger for updated_at on beauty_plans
CREATE OR REPLACE FUNCTION update_beauty_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_beauty_plans_updated_at ON beauty_plans;
CREATE TRIGGER update_beauty_plans_updated_at
BEFORE UPDATE ON beauty_plans
FOR EACH ROW
EXECUTE FUNCTION update_beauty_plans_updated_at();

-- Trigger for updated_at on beauty_plan_products
CREATE OR REPLACE FUNCTION update_beauty_plan_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_beauty_plan_products_updated_at ON beauty_plan_products;
CREATE TRIGGER update_beauty_plan_products_updated_at
BEFORE UPDATE ON beauty_plan_products
FOR EACH ROW
EXECUTE FUNCTION update_beauty_plan_products_updated_at();

-- Add allow client profile view policy for beauty plans
DROP POLICY IF EXISTS "Clients can view their own beauty plans" ON beauty_plans;
CREATE POLICY "Clients can view their own beauty plans" 
ON beauty_plans FOR SELECT 
USING (
  client_id IN (
    SELECT id FROM clients WHERE user_id = auth.uid()
  )
);

-- Add allow client profile view policy for beauty plan products
DROP POLICY IF EXISTS "Clients can view their own beauty plan products" ON beauty_plan_products;
CREATE POLICY "Clients can view their own beauty plan products" 
ON beauty_plan_products FOR SELECT 
USING (
  plan_id IN (
    SELECT id FROM beauty_plans WHERE client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  )
);

-- Public access policies for shareable links (security by obscurity via UUID)
DROP POLICY IF EXISTS "Anyone can view a beauty plan if they have the ID" ON beauty_plans;
CREATE POLICY "Anyone can view a beauty plan if they have the ID"
ON beauty_plans FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Anyone can view beauty plan products if they have the plan ID" ON beauty_plan_products;
CREATE POLICY "Anyone can view beauty plan products if they have the plan ID"
ON beauty_plan_products FOR SELECT
USING (true);
