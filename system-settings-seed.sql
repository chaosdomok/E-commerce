-- Seed data dla tabeli system_settings
-- Zgodnie z planem Faza 2, Etap 2

INSERT INTO public.system_settings (key, value, updated_at) VALUES
('allow_book_submission', 'true', NOW()),
('reservation_expiry_hours', '12', NOW()),
('contact_email', 'admin@targi-ksiazek.pl', NOW()),
('school_name', 'Szkoła Podstawowa', NOW()),
('terms_url', '/regulamin', NOW());