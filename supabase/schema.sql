-- SUE Database Schema
-- Student Textbook Exchange Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(200),
  initials VARCHAR(10),
  class VARCHAR(20),
  school VARCHAR(200),
  department VARCHAR(100),
  reputation_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  condition VARCHAR(50) NOT NULL CHECK (condition IN ('IDEALNY', 'JAK NOWY', 'DOBRY', 'UŻYWANY', 'WYMAGA REPERACJI')),
  course_code VARCHAR(50),
  cover_url TEXT,
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'SOLD', 'RESERVED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_seller_id ON books(seller_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_course_code ON books(course_code);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_book_id ON cart_items(book_id);
