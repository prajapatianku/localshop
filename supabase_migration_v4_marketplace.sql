-- Gully Trader / Local Shop Hyperlocal Marketplace Schema Migration
-- Drop all existing trading journal tables
DROP TABLE IF EXISTS trade_checklist_results CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS strategy_rules CASCADE;
DROP TABLE IF EXISTS strategies CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (replaces old profiles)
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email text NOT NULL,
    phone text UNIQUE,
    full_name text,
    role text NOT NULL CHECK (role IN ('customer', 'shopkeeper', 'admin')) DEFAULT 'customer',
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. Shops Table
CREATE TABLE public.shops (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    phone text,
    verification_level text NOT NULL CHECK (verification_level IN ('basic', 'verified', 'premium')) DEFAULT 'basic',
    status text NOT NULL CHECK (status IN ('open', 'closing_soon', 'closed', 'temporarily_closed', 'holiday')) DEFAULT 'closed',
    delivery_available boolean DEFAULT true NOT NULL,
    delivery_radius_km numeric(5,2) DEFAULT 5.00 NOT NULL,
    delivery_charge numeric(10,2) DEFAULT 30.00 NOT NULL,
    free_delivery_threshold numeric(10,2) DEFAULT 500.00 NOT NULL,
    estimated_delivery_time text DEFAULT '30-45 minutes' NOT NULL,
    latitude numeric(9,6),
    longitude numeric(9,6),
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to shops" ON public.shops
    FOR SELECT USING (true);

CREATE POLICY "Allow shopkeepers to insert their own shop" ON public.shops
    FOR INSERT WITH CHECK (
        auth.uid() = owner_id AND 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'shopkeeper')
    );

CREATE POLICY "Allow shopkeepers to update their own shop" ON public.shops
    FOR UPDATE USING (auth.uid() = owner_id);

-- 3. Categories Table
CREATE TABLE public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    slug text UNIQUE NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to categories" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Allow admins to modify categories" ON public.categories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Products Table
CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL CHECK (price >= 0),
    availability_status text NOT NULL CHECK (availability_status IN ('in_stock', 'limited_stock', 'out_of_stock')) DEFAULT 'in_stock',
    variants jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to products" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Allow shopkeepers to modify products in their shops" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.shops 
            WHERE id = products.shop_id AND owner_id = auth.uid()
        )
    );

-- 5. Orders Table
CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'dispatched', 'completed', 'cancelled')) DEFAULT 'pending',
    delivery_address text NOT NULL,
    delivery_charge numeric(10,2) DEFAULT 0.00 NOT NULL,
    total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own orders" ON public.orders
    FOR SELECT USING (
        auth.uid() = customer_id OR 
        EXISTS (SELECT 1 FROM public.shops WHERE id = orders.shop_id AND owner_id = auth.uid())
    );

CREATE POLICY "Allow customers to place orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Allow parties to update orders" ON public.orders
    FOR UPDATE USING (
        auth.uid() = customer_id OR 
        EXISTS (SELECT 1 FROM public.shops WHERE id = orders.shop_id AND owner_id = auth.uid())
    );

-- 6. Order Items Table
CREATE TABLE public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    variant_name text,
    quantity integer NOT NULL CHECK (quantity > 0),
    price_per_item numeric(10,2) NOT NULL CHECK (price_per_item >= 0)
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view items of visible orders" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE id = order_items.order_id AND (
                customer_id = auth.uid() OR 
                EXISTS (SELECT 1 FROM public.shops WHERE id = orders.shop_id AND owner_id = auth.uid())
            )
        )
    );

CREATE POLICY "Allow inserting order items during checkout" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.orders WHERE id = order_items.order_id AND customer_id = auth.uid())
    );

-- 7. Messages Table
CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    message_text text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own message history" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Allow users to send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 8. Reviews Table (Restricted to customers who completed an order)
CREATE TABLE public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text text,
    created_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (customer_id, shop_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to reviews" ON public.reviews
    FOR SELECT USING (true);

-- Security Definer function to check if customer has a completed order
CREATE OR REPLACE FUNCTION public.has_completed_order(cust_id uuid, sh_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.orders 
        WHERE customer_id = cust_id 
          AND shop_id = sh_id 
          AND status = 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Allow reviews by completed order buyers only" ON public.reviews
    FOR INSERT WITH CHECK (
        auth.uid() = customer_id AND 
        public.has_completed_order(auth.uid(), shop_id)
    );

-- 9. Subscriptions Table
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    status text NOT NULL CHECK (status IN ('active', 'expired')) DEFAULT 'active',
    ends_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to subscriptions" ON public.subscriptions
    FOR SELECT USING (true);

CREATE POLICY "Allow admins to manage subscriptions" ON public.subscriptions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 10. Addresses Table
CREATE TABLE public.addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    address_line text NOT NULL,
    latitude numeric(9,6) NOT NULL,
    longitude numeric(9,6) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their own addresses" ON public.addresses
    FOR ALL USING (auth.uid() = user_id);

-- Trigger to enforce only one default address per user
CREATE OR REPLACE FUNCTION public.unmark_other_default_addresses()
RETURNS trigger AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE public.addresses 
        SET is_default = false 
        WHERE user_id = NEW.user_id AND id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER default_address_trigger
    BEFORE INSERT OR UPDATE OF is_default ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION public.unmark_other_default_addresses();

-- 11. Favorites Table
CREATE TABLE public.favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now() NOT NULL,
    CHECK (product_id IS NOT NULL OR shop_id IS NOT NULL),
    UNIQUE (user_id, product_id, shop_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their favorites" ON public.favorites
    FOR ALL USING (auth.uid() = user_id);

-- 12. Notifications Table
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to manage their notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

-- 13. Product Images Table
CREATE TABLE public.product_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    image_url text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to product images" ON public.product_images
    FOR SELECT USING (true);

CREATE POLICY "Allow shopkeepers to manage images for their products" ON public.product_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products p
            JOIN public.shops s ON p.shop_id = s.id
            WHERE p.id = product_images.product_id AND s.owner_id = auth.uid()
        )
    );

-- 14. Shop Images Table
CREATE TABLE public.shop_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
    image_url text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.shop_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to shop images" ON public.shop_images
    FOR SELECT USING (true);

CREATE POLICY "Allow shopkeepers to manage images for their shops" ON public.shop_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.shops 
            WHERE id = shop_images.shop_id AND owner_id = auth.uid()
        )
    );

-- 15. Reports Table
CREATE TABLE public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
    reported_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
    reason text NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'resolved', 'dismissed')) DEFAULT 'pending',
    created_at timestamptz DEFAULT now() NOT NULL,
    CHECK (reported_shop_id IS NOT NULL OR reported_product_id IS NOT NULL)
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own reports" ON public.reports
    FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Allow users to file reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Allow admins to review all reports" ON public.reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Trigger to sync new user signups from auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', ''),
        -- First user will automatically be designated as Admin for development and testing
        CASE 
            WHEN NOT EXISTS (SELECT 1 FROM public.profiles) THEN 'admin'
            ELSE COALESCE(new.raw_user_meta_data->>'role', 'customer')
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
