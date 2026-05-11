-- Beta invite system for closed beta access
CREATE TABLE IF NOT EXISTS public.beta_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  max_uses int NOT NULL DEFAULT 1,
  current_uses int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_invites ENABLE ROW LEVEL SECURITY;

-- Admin can read and manage all invites directly
CREATE POLICY "admin_all_beta_invites" ON public.beta_invites
  FOR ALL
  TO authenticated
  USING (auth.email() = 'ishaankumar719@gmail.com')
  WITH CHECK (auth.email() = 'ishaankumar719@gmail.com');

-- Validate invite code — callable by anon and authenticated (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.validate_beta_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.beta_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM public.beta_invites WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid');
  END IF;

  IF NOT v_invite.is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid');
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  IF v_invite.current_uses >= v_invite.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'used');
  END IF;

  RETURN jsonb_build_object('valid', true);
END;
$$;

-- Claim invite code atomically — only authenticated users
CREATE OR REPLACE FUNCTION public.claim_beta_invite(p_code text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.beta_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM public.beta_invites WHERE code = p_code FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid');
  END IF;

  IF NOT v_invite.is_active OR v_invite.current_uses >= v_invite.max_uses THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_uses_left');
  END IF;

  UPDATE public.beta_invites
  SET
    current_uses = current_uses + 1,
    claimed_by = CASE WHEN v_invite.max_uses = 1 THEN p_user_id ELSE v_invite.claimed_by END,
    claimed_at = CASE WHEN v_invite.max_uses = 1 THEN now() ELSE v_invite.claimed_at END
  WHERE code = p_code;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_beta_invite(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_beta_invite(text, uuid) TO authenticated;
