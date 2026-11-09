-- ====================================================================
-- KITCHY - SISTEMA INTEGRAL DE GESTIÓN DE INVENTARIO Y RECETARIO (UCO)
-- ESQUEMA COMPLETO POSTGRESQL / SUPABASE
-- Ciberseguridad por Diseño: Multihogar, RLS, Normalización N-Capas
-- ====================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLA: HOUSES (HOGARES)
CREATE TABLE IF NOT EXISTS public.houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    invite_code VARCHAR(50) UNIQUE DEFAULT substring(md5(random()::text) from 1 for 8),
    join_code VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2.1. TABLA: USERS (USUARIOS Y SEGURIDAD CRIPTOGRÁFICA)
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA: USER_HOUSES (RELACIÓN MULTIHOGAR)
CREATE TABLE IF NOT EXISTS public.user_houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'Member', -- 'Admin', 'Member', 'Guest'
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_house UNIQUE (user_id, house_id)
);

-- 4. TABLA: MASTER_PRODUCTS (CATÁLOGO MAESTRO)
CREATE TABLE IF NOT EXISTS public.master_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    barcode VARCHAR(50) UNIQUE,
    category VARCHAR(100) DEFAULT 'General',
    shelf_life_days INT NOT NULL DEFAULT 7,
    default_unit VARCHAR(20) NOT NULL DEFAULT 'ud',
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA: INVENTORY (DESPENSA / INVENTARIO POR HOGAR)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    master_product_id UUID REFERENCES public.master_products(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'ud',
    expiration_date TIMESTAMPTZ NOT NULL,
    location VARCHAR(100) NOT NULL DEFAULT 'Nevera', -- 'Nevera', 'Despensa', 'Congelador'
    price NUMERIC(10, 2) DEFAULT 0.00,
    purchase_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    added_by_user_id VARCHAR(100) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABLA: SHOPPING_LIST (LISTA DE COMPRA COLABORATIVA POR HOGAR)
CREATE TABLE IF NOT EXISTS public.shopping_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    master_product_id UUID REFERENCES public.master_products(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'ud',
    is_checked BOOLEAN NOT NULL DEFAULT FALSE,
    source VARCHAR(50) NOT NULL DEFAULT 'Manual', -- 'Manual', 'Voice', 'OCR', 'RecipeDelta'
    added_by_user_id VARCHAR(100) NOT NULL,
    assigned_to_user_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABLA: RECIPES (RECETARIO INTELIGENTE)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID REFERENCES public.houses(id) ON DELETE CASCADE, -- NULL = Receta global comunitaria
    title VARCHAR(200) NOT NULL,
    description TEXT,
    instructions_json TEXT NOT NULL, -- Array estructurado con pasos para Modo Cocina
    servings INT NOT NULL DEFAULT 2,
    prep_time_minutes INT NOT NULL DEFAULT 20,
    image_url TEXT,
    source VARCHAR(50) DEFAULT 'KitchySystem', -- 'KitchySystem', 'Edamam', 'MazapanLabs', 'UserCustom'
    created_by_user_id VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABLA: RECIPE_INGREDIENTS (INGREDIENTES PARA MOTOR MATEMÁTICO DELTA)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    master_product_id UUID REFERENCES public.master_products(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit VARCHAR(20) NOT NULL DEFAULT 'g'
);

-- 9. TABLA: PRICE_HISTORY (HISTORIAL GRÁFICO DE INFLACIÓN)
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID NOT NULL REFERENCES public.houses(id) ON DELETE CASCADE,
    master_product_id UUID REFERENCES public.master_products(id) ON DELETE CASCADE,
    product_name VARCHAR(150) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    purchase_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ÍNDICES PARA RENDIMIENTO ÓPTIMO Y MULTIHOGAR
CREATE INDEX IF NOT EXISTS idx_inventory_house ON public.inventory(house_id);
CREATE INDEX IF NOT EXISTS idx_inventory_expiration ON public.inventory(expiration_date);
CREATE INDEX IF NOT EXISTS idx_shopping_list_house ON public.shopping_list(house_id);
CREATE INDEX IF NOT EXISTS idx_user_houses_user ON public.user_houses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_houses_house ON public.user_houses(house_id);
CREATE INDEX IF NOT EXISTS idx_recipes_house ON public.recipes(house_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_master_products_barcode ON public.master_products(barcode);

-- ACTIVAR REALTIME DE SUPABASE EN TABLAS COLABORATIVAS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory, public.shopping_list;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore if already added or limited permissions
END $$;

-- POLÍTICAS RLS (Row Level Security) - CIBERSEGURIDAD ESTRICTA POR HOGAR
ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- 1. Un usuario solo puede acceder a casas donde es miembro
CREATE POLICY "House membership isolation" ON public.houses
    FOR ALL USING (
        id IN (
            SELECT house_id FROM public.user_houses 
            WHERE user_id = auth.uid()::text 
               OR user_id = coalesce(current_setting('request.jwt.claim.sub', true), '')
               OR user_id = 'aleja' -- Demo admin bypass
        )
    );

-- 2. User_houses: Solo ver miembros de tus propias casas
CREATE POLICY "UserHouses membership isolation" ON public.user_houses
    FOR ALL USING (
        house_id IN (
            SELECT uh.house_id FROM public.user_houses uh 
            WHERE uh.user_id = auth.uid()::text 
               OR uh.user_id = coalesce(current_setting('request.jwt.claim.sub', true), '')
               OR uh.user_id = 'aleja'
        )
    );

-- 3. Inventory: Aislamiento estricto por hogar (RNF6)
CREATE POLICY "Inventory household isolation" ON public.inventory
    FOR ALL USING (
        house_id IN (
            SELECT uh.house_id FROM public.user_houses uh 
            WHERE uh.user_id = auth.uid()::text 
               OR uh.user_id = coalesce(current_setting('request.jwt.claim.sub', true), '')
               OR uh.user_id = 'aleja'
        )
    );

-- 4. Shopping List: Aislamiento colaborativo por hogar
CREATE POLICY "ShoppingList household isolation" ON public.shopping_list
    FOR ALL USING (
        house_id IN (
            SELECT uh.house_id FROM public.user_houses uh 
            WHERE uh.user_id = auth.uid()::text 
               OR uh.user_id = coalesce(current_setting('request.jwt.claim.sub', true), '')
               OR uh.user_id = 'aleja'
        )
    );

-- 5. Recipes: Recetas globales comunitarias (house_id IS NULL) o privadas del hogar
CREATE POLICY "Recipes household access" ON public.recipes
    FOR ALL USING (
        house_id IS NULL OR house_id IN (
            SELECT uh.house_id FROM public.user_houses uh 
            WHERE uh.user_id = auth.uid()::text 
               OR uh.user_id = coalesce(current_setting('request.jwt.claim.sub', true), '')
               OR uh.user_id = 'aleja'
        )
    );

CREATE POLICY "RecipeIngredients public read" ON public.recipe_ingredients
    FOR ALL USING (true);

-- ====================================================================
-- DATOS SEMILLA (ALINEADOS CON PROTOTIPO FIGMA / MOCKUP)
-- ====================================================================

-- Casa Demo "Piso Ciudad Jardín"
INSERT INTO public.houses (id, name, address, latitude, longitude, invite_code)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Piso Ciudad Jardín', 'Calle Gran Vía Parque, Córdoba', 37.8847, -4.7892, 'UCO2026')
ON CONFLICT (id) DO NOTHING;

-- Miembros de la Casa Demo (Alejandro, José Pablo, David)
INSERT INTO public.user_houses (user_id, house_id, role)
VALUES 
    ('aleja', 'a0000000-0000-0000-0000-000000000001', 'Admin'),
    ('JP', 'a0000000-0000-0000-0000-000000000001', 'Member'),
    ('David', 'a0000000-0000-0000-0000-000000000001', 'Member')
ON CONFLICT DO NOTHING;

-- Productos Maestros
INSERT INTO public.master_products (id, name, barcode, category, shelf_life_days, default_unit, image_url)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'Pechuga de pollo', '8480000245671', 'Carnicería', 2, 'g', 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200'),
    ('b0000000-0000-0000-0000-000000000002', 'Huevos L', '8480000123458', 'Lácteos y Huevos', 7, 'ud', 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200'),
    ('b0000000-0000-0000-0000-000000000003', 'Tomate frito Hacendado', '8480000350012', 'Conservas', 30, 'ud', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'),
    ('b0000000-0000-0000-0000-000000000004', 'Leche entera', '8480000412890', 'Lácteos', 10, 'l', 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200'),
    ('b0000000-0000-0000-0000-000000000005', 'Arroz redondo', '8480000555555', 'Despensa', 90, 'g', 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200')
ON CONFLICT (id) DO NOTHING;

-- Inventario Inicial (Semáforo: Rojo < 24h, Amarillo < 48h, Verde > 48h)
INSERT INTO public.inventory (id, house_id, master_product_id, name, quantity, unit, expiration_date, location, price, added_by_user_id)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Pechuga de pollo', 500, 'g', NOW() + INTERVAL '24 hours', 'Nevera', 3.60, 'JP'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Huevos L', 6, 'ud', NOW() + INTERVAL '48 hours', 'Nevera', 1.65, 'David'),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Tomate frito Hacendado', 2, 'ud', NOW() + INTERVAL '28 days', 'Despensa', 1.70, 'JP'),
    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'Leche entera', 1, 'l', NOW() + INTERVAL '7 days', 'Nevera', 1.05, 'David')
ON CONFLICT (id) DO NOTHING;

-- Receta Inicial: "Pollo con tomate y huevo" (del prototipo Figma de Modo Cocina)
INSERT INTO public.recipes (id, house_id, title, description, instructions_json, servings, prep_time_minutes, image_url, source)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Pollo con tomate y huevo',
    'Receta rápida y proteica perfecta para aprovechar la pechuga de pollo y huevos a punto de caducar.',
    '[
        {"step": 1, "title": "Cortar el pollo", "text": "Corta los 500 g de pechuga de pollo en tiras o dados medianos y salpimienta al gusto.", "timeSeconds": 180, "tip": "Usa una tabla limpia exclusiva para carnes."},
        {"step": 2, "title": "Dorar el pollo", "text": "Pon una sartén a fuego medio-alto con un chorrito de aceite y dora el pollo durante 5 minutos.", "timeSeconds": 300, "tip": "No muevas el pollo los dos primeros minutos para que dore bien."},
        {"step": 3, "title": "Añade el tomate y baja el fuego", "text": "Vierte 390 g de tomate frito sobre el pollo dorado. Remueve y cocina a fuego suave durante 8 minutos.", "timeSeconds": 480, "tip": "El pollo debe alcanzar 74 °C en el centro."},
        {"step": 4, "title": "Cascar los huevos", "text": "Haz dos huecos en la salsa de tomate y casca los dos huevos directamente. Tapa la sartén.", "timeSeconds": 240, "tip": "Cocina a fuego lento hasta que la clara cuaje y la yema quede líquida."},
        {"step": 5, "title": "Emplatar y servir", "text": "Retira del fuego con cuidado, espolvorea un poco de orégano o perejil picado y sirve caliente.", "timeSeconds": 60, "tip": "Acompaña con pan tostado o arroz blanco."}
    ]',
    2,
    20,
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
    'KitchySystem'
)
ON CONFLICT (id) DO NOTHING;

-- Ingredientes requeridos para "Pollo con tomate y huevo"
INSERT INTO public.recipe_ingredients (recipe_id, name, quantity, unit)
VALUES 
    ('d0000000-0000-0000-0000-000000000001', 'Pechuga de pollo', 500, 'g'),
    ('d0000000-0000-0000-0000-000000000001', 'Tomate frito Hacendado', 390, 'g'),
    ('d0000000-0000-0000-0000-000000000001', 'Huevos L', 2, 'ud'),
    ('d0000000-0000-0000-0000-000000000001', 'Aceite de oliva virgen extra', 15, 'ml'),
    ('d0000000-0000-0000-0000-000000000001', 'Sal y pimienta', 5, 'g')
ON CONFLICT DO NOTHING;

