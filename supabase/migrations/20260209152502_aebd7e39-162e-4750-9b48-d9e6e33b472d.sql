-- Create a security definer function to search experts without exposing PII
CREATE OR REPLACE FUNCTION public.search_experts(
  p_search text DEFAULT NULL,
  p_availability text DEFAULT NULL,
  p_max_rate numeric DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  photo_url text,
  bio text,
  availability text,
  hourly_rate numeric,
  skills jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    u.id,
    u.name,
    u.photo_url,
    u.bio,
    u.availability,
    u.hourly_rate::numeric,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'category', s.category))
       FROM doer_skills ds
       JOIN skills s ON s.id = ds.skill_id
       WHERE ds.user_id = u.id),
      '[]'::jsonb
    ) as skills
  FROM users u
  WHERE u.active_role = 'doer'
    AND u.onboarding_completed = true
    AND u.deleted_at IS NULL
    AND auth.uid() IS NOT NULL
    AND (p_availability IS NULL OR p_availability = 'all' OR u.availability = p_availability)
    AND (p_max_rate IS NULL OR p_max_rate >= 200 OR u.hourly_rate IS NULL OR u.hourly_rate <= p_max_rate)
    AND (
      p_search IS NULL OR p_search = '' 
      OR u.name ILIKE '%' || p_search || '%' 
      OR u.bio ILIKE '%' || p_search || '%'
    )
$$;