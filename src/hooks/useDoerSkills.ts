import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { logger } from '@/lib/logger';

export const useDoerSkills = () => {
  const { user } = useUser();
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSkills = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('doer_skills')
          .select('category')
          .eq('user_id', user.id);

        if (error) throw error;
        
        const categories = data?.map(s => s.category) || [];
        setSkills([...new Set(categories)]);
      } catch (error) {
        logger.error('Error fetching doer skills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, [user?.id]);

  return { skills, loading };
};
