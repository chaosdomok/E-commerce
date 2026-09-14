-- Seed Data for SUE Database
-- Realistic test data for development and UI testing

-- Insert dummy profiles (mock UUIDs)
INSERT INTO profiles (id, initials, department, reputation_score) VALUES
  ('00000000-0000-0000-0000-000000000001', 'JK', 'Informatyka', 15),
  ('00000000-0000-0000-0000-000000000002', 'MP', 'Matematyka', 23)
ON CONFLICT (id) DO NOTHING;

-- Insert technical textbooks with real Unsplash image URLs
INSERT INTO books (id, title, author, price, condition, course_code, cover_url, seller_id, status) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Introduction to Algorithms',
    'Thomas H. Cormen',
    89.50,
    'JAK NOWY',
    'CS 301',
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=600&auto=format&fit=crop',
    '00000000-0000-0000-0000-000000000001',
    'AVAILABLE'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Linear Algebra and Its Applications',
    'David C. Lay',
    65.00,
    'DOBRY',
    'MATH 224',
    'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=600&auto=format&fit=crop',
    '00000000-0000-0000-0000-000000000001',
    'AVAILABLE'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Machine Learning Yearning',
    'Andrew Ng',
    45.00,
    'IDEALNY',
    'CS 401',
    'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?q=80&w=600&auto=format&fit=crop',
    '00000000-0000-0000-0000-000000000002',
    'AVAILABLE'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'Clean Code: A Handbook of Agile Software Craftsmanship',
    'Robert C. Martin',
    55.00,
    'JAK NOWY',
    'CS 250',
    'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=600&auto=format&fit=crop',
    '00000000-0000-0000-0000-000000000002',
    'AVAILABLE'
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    'Data Structures and Algorithms in Java',
    'Robert Lafore',
    72.00,
    'DOBRY',
    'CS 201',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600&auto=format&fit=crop',
    '00000000-0000-0000-0000-000000000001',
    'AVAILABLE'
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    'Calculus: Early Transcendentals',
    'James Stewart',
    95.00,
    'UŻYWANY',
    'MATH 101',
    'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=600&auto=format&fit=crop',
    '00000000-0000-0000-0000-000000000002',
    'AVAILABLE'
  ),
  (
    '10000000-0000-0000-0000-000000000007',
    'Deep Learning',
    'Ian Goodfellow',
    120.00,
    'JAK NOWY',
    'CS 450',
    'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?q=80&w=600&auto=format&fit=crop',
    '00000000-0000-0000-0000-000000000001',
    'AVAILABLE'
  ),
  (
    '10000000-0000-0000-0000-000000000008',
    'Computer Networks: A Top-Down Approach',
    'James F. Kurose',
    68.00,
    'DOBRY',
    'CS 350',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=600&auto=format&fit=crop',
    '00000000-0000-0000-0000-000000000002',
    'AVAILABLE'
  ),
  (
    '10000000-0000-0000-0000-000000000009',
    'Database System Concepts',
    'Abraham Silberschatz',
    78.00,
    'IDEALNY',
    'CS 320',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop',
    '00000000-0000-0000-0000-000000000001',
    'AVAILABLE'
  ),
  (
    '10000000-0000-0000-0000-000000000010',
    'Operating System Concepts',
    'Abraham Silberschatz',
    85.00,
    'JAK NOWY',
    'CS 310',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600&auto=format&fit=crop',
    '00000000-0000-0000-0000-000000000002',
    'AVAILABLE'
  )
ON CONFLICT (id) DO NOTHING;
