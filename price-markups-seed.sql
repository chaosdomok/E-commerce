-- Seed data dla tabeli price_markups
-- Zgodnie z planem Faza 2, Etap 4

INSERT INTO public.price_markups (id, min_price, max_price, markup) VALUES
(gen_random_uuid(), 1.00, 10.00, 4.00),
(gen_random_uuid(), 11.00, 20.00, 5.00),
(gen_random_uuid(), 21.00, 30.00, 6.00),
(gen_random_uuid(), 31.00, 50.00, 7.00),
(gen_random_uuid(), 51.00, 80.00, 8.00),
(gen_random_uuid(), 81.00, NULL, 10.00);