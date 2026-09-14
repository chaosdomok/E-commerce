-- Polityki RLS dla tabel z Faza 2, Etap 2 i podstawowe tabele
-- Te polityki muszą być ręcznie dodane w Supabase po migracji Prisma

-- Polityki dla tabeli profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_admin')
    )
  );

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_admin')
    )
  );

CREATE POLICY "Service role can manage profiles"
  ON public.profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Polityki dla tabeli books
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available books"
  ON public.books FOR SELECT
  USING (true);

CREATE POLICY "Book owners can update their books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Book owners can delete their books"
  ON public.books FOR DELETE
  TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Admins can update any book"
  ON public.books FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_admin')
    )
  );

CREATE POLICY "Admins can delete any book"
  ON public.books FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_admin')
    )
  );

CREATE POLICY "Service role can manage books"
  ON public.books FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Polityki dla tabeli reservations
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all reservations"
  ON public.reservations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_admin')
    )
  );

CREATE POLICY "Service role can manage reservations"
  ON public.reservations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Polityki dla tabeli reservation_items
ALTER TABLE public.reservation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reservation items"
  ON public.reservation_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations
      WHERE reservations.id = reservation_items.reservation_id
      AND reservations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all reservation items"
  ON public.reservation_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_admin')
    )
  );

CREATE POLICY "Service role can manage reservation items"
  ON public.reservation_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Polityki dla tabeli audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_admin')
    )
  );

CREATE POLICY "Service role can manage audit logs"
  ON public.audit_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Polityki dla tabeli users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own user record"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_admin')
    )
  );

CREATE POLICY "Service role can manage users"
  ON public.users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Polityki dla tabeli orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'head_admin')
    )
  );

CREATE POLICY "Service role can manage orders"
  ON public.orders FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Polityki dla tabeli price_markups
ALTER TABLE public.price_markups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read price markups"
  ON public.price_markups FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage price markups"
  ON public.price_markups FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Polityki dla tabeli system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read system settings"
  ON public.system_settings FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage system settings"
  ON public.system_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Polityki dla tabeli isbn_books
ALTER TABLE public.isbn_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read isbn books"
  ON public.isbn_books FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage isbn books"
  ON public.isbn_books FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Polityki dla tabeli allowed_students (jeśli nie istnieją)
ALTER TABLE public.allowed_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read allowed students"
  ON public.allowed_students FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage allowed students"
  ON public.allowed_students FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Polityki dla tabeli notifications (zgodnie z planem Faza 0)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update notifications"
  ON public.notifications FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Users can update own notifications (mark as read)"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users cannot delete notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (false);