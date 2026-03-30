-- ----------------------------------------------------------------
-- Auto-create a default campaign for every new user on sign-up
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_default_campaign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.campaigns (user_id, name, description, color)
  VALUES (
    NEW.id,
    'My Campaign',
    'Default campaign — rename or add more in Setup.',
    '#0071E3'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_campaign();
