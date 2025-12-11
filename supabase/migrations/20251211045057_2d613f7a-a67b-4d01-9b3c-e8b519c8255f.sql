-- Drop and recreate get_doer_profile function to return skill names with icons
DROP FUNCTION IF EXISTS public.get_doer_profile(uuid);

CREATE FUNCTION public.get_doer_profile(_user_id uuid)
 RETURNS TABLE(id uuid, name text, photo_url text, skills jsonb, avg_rating numeric, total_reviews bigint, completed_tasks bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    u.id,
    u.name,
    u.photo_url,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('name', s.name, 'icon', s.icon))
       FROM doer_skills ds 
       JOIN skills s ON s.id = ds.skill_id 
       WHERE ds.user_id = u.id),
      '[]'::jsonb
    ) as skills,
    COALESCE(AVG(r.stars)::numeric, 0) as avg_rating,
    COUNT(DISTINCT r.id) as total_reviews,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks
  FROM users u
  LEFT JOIN ratings r ON r.to_user = u.id
  LEFT JOIN tasks t ON t.doer_id = u.id
  WHERE u.id = _user_id
  AND auth.uid() IS NOT NULL
  GROUP BY u.id, u.name, u.photo_url
$function$;