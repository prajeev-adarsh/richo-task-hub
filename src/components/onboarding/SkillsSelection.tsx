import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SkillsSelectionProps {
  selectedSkills: string[];
  onSkillsChange: (skills: string[]) => void;
}

const SKILL_CATEGORIES = [
  { id: 'student', label: 'Student Tasks', description: 'Tutoring, assignments, research, academic help' },
  { id: 'skilled', label: 'Skilled Work', description: 'Plumbing, electrical, carpentry, repairs, delivery, errands' },
  { id: 'ai', label: 'AI & Tech', description: 'Data entry, virtual assistance, online research, tech support' },
  { id: 'custom', label: 'Custom Tasks', description: 'Creative work, events, home services, other tasks' },
];

const SkillsSelection: React.FC<SkillsSelectionProps> = ({ selectedSkills, onSkillsChange }) => {
  const toggleSkill = (skillId: string) => {
    if (selectedSkills.includes(skillId)) {
      onSkillsChange(selectedSkills.filter(s => s !== skillId));
    } else {
      onSkillsChange([...selectedSkills, skillId]);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center mb-4">
        Select the categories you can work in. You'll receive notifications when matching tasks are posted.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SKILL_CATEGORIES.map((skill) => {
          const isSelected = selectedSkills.includes(skill.id);
          return (
            <Card
              key={skill.id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                isSelected && 'border-primary bg-primary/5'
              )}
              onClick={() => toggleSkill(skill.id)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                  isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                )}>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div>
                  <h4 className="font-medium">{skill.label}</h4>
                  <p className="text-sm text-muted-foreground">{skill.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SkillsSelection;