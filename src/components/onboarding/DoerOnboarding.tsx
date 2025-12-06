import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Search, Briefcase, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/components/UserContext';
import { logger } from '@/lib/logger';

const DoerOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Richo!',
      description: 'As a doer, you can find tasks that match your skills and earn money.',
      icon: CheckCircle2,
    },
    {
      title: 'Browse Available Tasks',
      description: 'Explore tasks posted by clients in various categories and locations.',
      icon: Search,
    },
    {
      title: 'Apply to Tasks',
      description: 'Apply to tasks you\'re interested in. Clients will review your profile and select you.',
      icon: Briefcase,
    },
  ];

  const handleComplete = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Onboarding Complete!',
        description: 'Let\'s find your first task.',
      });

      navigate('/browse-tasks');
    } catch (error) {
      logger.error('Error completing onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete onboarding',
        variant: 'destructive',
      });
    }
  };

  const handleSkip = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', user?.id);

      if (error) throw error;
      navigate('/doer-dashboard');
    } catch (error) {
      logger.error('Error skipping onboarding:', error);
    }
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
          <CardDescription className="text-base mt-2">
            {currentStepData.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-primary'
                    : index < currentStep
                    ? 'w-2 bg-primary'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              onClick={handleSkip}
            >
              Skip Tour
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="gradient-primary text-primary-foreground"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                className="gradient-primary text-primary-foreground"
              >
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoerOnboarding;
