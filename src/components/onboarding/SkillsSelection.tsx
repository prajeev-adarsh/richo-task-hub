import React, { useState, useEffect } from 'react';
import { CheckCircle2, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface SkillsSelectionProps {
  selectedSkills: string[]; // skill IDs
  onSkillsChange: (skills: string[]) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  custom: { label: 'Creative & Design', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  ai: { label: 'Tech & Digital', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  student: { label: 'Academic & Writing', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  skilled: { label: 'Trades & Services', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
};

const SkillsSelection: React.FC<SkillsSelectionProps> = ({ selectedSkills, onSkillsChange }) => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['custom', 'ai', 'student', 'skilled']);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('id, name, category')
        .order('name');

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      logger.error('Error fetching skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    if (selectedSkills.includes(skillId)) {
      onSkillsChange(selectedSkills.filter(id => id !== skillId));
    } else {
      onSkillsChange([...selectedSkills, skillId]);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Group skills by category
  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  // Filter skills based on search
  const filteredGroupedSkills = Object.entries(groupedSkills).reduce((acc, [category, categorySkills]) => {
    const filtered = categorySkills.filter(skill =>
      skill.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) acc[category] = filtered;
    return acc;
  }, {} as Record<string, Skill[]>);

  // Count selected skills per category
  const selectedCountByCategory = (category: string) => {
    return skills.filter(s => s.category === category && selectedSkills.includes(s.id)).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Select your skills to receive notifications for matching tasks.
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Selected count */}
      {selectedSkills.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {selectedSkills.length} selected
          </Badge>
        </div>
      )}

      {/* Skills by category */}
      <ScrollArea className="h-[320px] pr-4">
        <div className="space-y-3">
          {Object.entries(filteredGroupedSkills).map(([category, categorySkills]) => {
            const categoryInfo = CATEGORY_LABELS[category] || { label: category, color: 'bg-gray-100 text-gray-800' };
            const selectedCount = selectedCountByCategory(category);
            const isExpanded = expandedCategories.includes(category);

            return (
              <Collapsible
                key={category}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{categoryInfo.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {categorySkills.length}
                    </Badge>
                  </div>
                  {selectedCount > 0 && (
                    <Badge className="bg-primary text-primary-foreground">
                      {selectedCount} selected
                    </Badge>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="flex flex-wrap gap-2 pl-6">
                    {categorySkills.map((skill) => {
                      const isSelected = selectedSkills.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          onClick={() => toggleSkill(skill.id)}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm border transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:border-primary/50 hover:bg-muted'
                          )}
                        >
                          {isSelected && <CheckCircle2 className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" />}
                          {skill.name}
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default SkillsSelection;
