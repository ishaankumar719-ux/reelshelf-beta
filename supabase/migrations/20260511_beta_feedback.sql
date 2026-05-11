-- Beta feedback table for in-app user feedback
CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL,
  message text NOT NULL,
  page_url text,
  screenshot_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new'
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users can submit feedback
CREATE POLICY "insert_own_feedback" ON public.beta_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin can see and manage all feedback
CREATE POLICY "admin_all_feedback" ON public.beta_feedback
  FOR ALL
  TO authenticated
  USING (auth.email() = 'ishaankumar719@gmail.com')
  WITH CHECK (auth.email() = 'ishaankumar719@gmail.com');
