-- Row Level Security (RLS) Policies for SUE Database

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
-- Anyone can read profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can only insert their own profile (typically handled by trigger)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Books RLS Policies
-- Anyone can read books (public access)
CREATE POLICY "Books are viewable by everyone"
  ON books FOR SELECT
  USING (true);

-- Only authenticated users can insert books
CREATE POLICY "Authenticated users can insert books"
  ON books FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = seller_id
  );

-- Only the seller_id can update their own books
CREATE POLICY "Sellers can update own books"
  ON books FOR UPDATE
  USING (auth.uid() = seller_id);

-- Only the seller_id can delete their own books
CREATE POLICY "Sellers can delete own books"
  ON books FOR DELETE
  USING (auth.uid() = seller_id);

-- Cart Items RLS Policies
-- Authenticated users can only select their own cart items
CREATE POLICY "Users can select own cart items"
  ON cart_items FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can only insert their own cart items
CREATE POLICY "Users can insert own cart items"
  ON cart_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can only update their own cart items
CREATE POLICY "Users can update own cart items"
  ON cart_items FOR UPDATE
  USING (auth.uid() = user_id);

-- Authenticated users can only delete their own cart items
CREATE POLICY "Users can delete own cart items"
  ON cart_items FOR DELETE
  USING (auth.uid() = user_id);
