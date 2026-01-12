import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Wrench, 
  Briefcase, 
  Clock,
  Upload,
  Sparkles,
  DollarSign,
  ImagePlus,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/components/UserContext';
import { logger } from '@/lib/logger';
import SkillsSelection from './SkillsSelection';

type Availability = 'full_time' | 'part_time' | 'weekends' | 'flexible';

interface PortfolioItem {
  title: string;
  description: string;
  imageUrl: string;
  file?: File;
}

const ExpertOnboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [availability, setAvailability] = useState<Availability>('flexible');
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

  const steps = [
    {
      title: 'Welcome, AI Expert!',
      description: 'Let\'s set up your profile to help clients find you.',
      icon: Sparkles,
    },
    {
      title: 'Select Your Skills',
      description: 'Choose the AI skills you specialize in. Clients will find you based on these.',
      icon: Wrench,
      component: 'skills',
    },
    {
      title: 'Your Availability',
      description: 'Let clients know when you\'re available to work.',
      icon: Clock,
      component: 'availability',
    },
    {
      title: 'Portfolio & Bio',
      description: 'Showcase your best work and tell clients about yourself.',
      icon: Briefcase,
      component: 'portfolio',
    },
    {
      title: 'You\'re All Set!',
      description: 'Your profile is ready. Start browsing projects and applying!',
      icon: CheckCircle2,
    },
  ];

  const saveSkills = async () => {
    if (!user?.id || selectedSkills.length === 0) return;

    try {
      await supabase
        .from('doer_skills')
        .delete()
        .eq('user_id', user.id);

      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select('id, category')
        .in('id', selectedSkills);

      if (skillsError) throw skillsError;

      const skillsToInsert = (skillsData || []).map(skill => ({
        user_id: user.id,
        skill_id: skill.id,
        category: skill.category as any,
      }));

      const { error } = await supabase
        .from('doer_skills')
        .insert(skillsToInsert);

      if (error) throw error;
    } catch (error) {
      logger.error('Error saving skills:', error);
      throw error;
    }
  };

  const savePortfolio = async () => {
    if (!user?.id || portfolioItems.length === 0) return;

    try {
      for (const item of portfolioItems) {
        if (item.file) {
          // Upload image to storage
          const fileExt = item.file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          
          const { error: uploadError, data } = await supabase.storage
            .from('portfolio')
            .upload(fileName, item.file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('portfolio')
            .getPublicUrl(fileName);

          // Insert portfolio item
          const { error } = await supabase
            .from('portfolio_items')
            .insert({
              user_id: user.id,
              title: item.title,
              description: item.description,
              image_url: publicUrl,
            });

          if (error) throw error;
        } else if (item.imageUrl) {
          // Use provided URL directly
          const { error } = await supabase
            .from('portfolio_items')
            .insert({
              user_id: user.id,
              title: item.title,
              description: item.description,
              image_url: item.imageUrl,
            });

          if (error) throw error;
        }
      }
    } catch (error) {
      logger.error('Error saving portfolio:', error);
      throw error;
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save skills
      if (selectedSkills.length > 0) {
        await saveSkills();
      }

      // Save portfolio
      if (portfolioItems.length > 0) {
        await savePortfolio();
      }

      // Update user profile
      const { error } = await supabase
        .from('users')
        .update({ 
          onboarding_completed: true,
          bio: bio || null,
          hourly_rate: hourlyRate ? parseInt(hourlyRate) : null,
          availability: availability,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Profile Complete!',
        description: 'You\'re ready to start finding AI projects.',
      });

      navigate('/browse-tasks');
    } catch (error) {
      logger.error('Error completing onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete profile setup',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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

  const handleNext = () => {
    if (steps[currentStep].component === 'skills' && selectedSkills.length === 0) {
      toast({
        title: 'Select at least one skill',
        description: 'Choose your AI expertise areas to help clients find you.',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleAddPortfolioItem = () => {
    setPortfolioItems([...portfolioItems, { title: '', description: '', imageUrl: '' }]);
  };

  const handleRemovePortfolioItem = (index: number) => {
    setPortfolioItems(portfolioItems.filter((_, i) => i !== index));
  };

  const handlePortfolioChange = (index: number, field: keyof PortfolioItem, value: string | File) => {
    const updated = [...portfolioItems];
    if (field === 'file') {
      updated[index].file = value as File;
    } else {
      updated[index][field] = value as string;
    }
    setPortfolioItems(updated);
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePortfolioChange(index, 'file', file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      handlePortfolioChange(index, 'imageUrl', previewUrl);
    }
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  const renderStepContent = () => {
    switch (currentStepData.component) {
      case 'skills':
        return (
          <SkillsSelection
            selectedSkills={selectedSkills}
            onSkillsChange={setSelectedSkills}
          />
        );
      
      case 'availability':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label>When are you available to work?</Label>
              <RadioGroup 
                value={availability} 
                onValueChange={(v) => setAvailability(v as Availability)}
                className="grid grid-cols-2 gap-3"
              >
                {[
                  { value: 'full_time', label: 'Full-time', desc: '40+ hrs/week' },
                  { value: 'part_time', label: 'Part-time', desc: '20-40 hrs/week' },
                  { value: 'weekends', label: 'Weekends', desc: 'Sat & Sun only' },
                  { value: 'flexible', label: 'Flexible', desc: 'Varies by project' },
                ].map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className={`flex items-center space-x-3 border rounded-xl p-4 cursor-pointer transition-all ${
                      availability === option.value 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{option.desc}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly-rate" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Hourly Rate (USD)
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="hourly-rate"
                type="number"
                placeholder="e.g. 50"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
        );

      case 'portfolio':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bio">About You</Label>
              <Textarea
                id="bio"
                placeholder="Tell clients about your AI expertise, experience, and what makes you unique..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="rounded-xl min-h-[100px]"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Portfolio Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPortfolioItem}
                  className="rounded-xl"
                >
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Add Work
                </Button>
              </div>

              {portfolioItems.length === 0 ? (
                <div className="border border-dashed rounded-xl p-6 text-center text-muted-foreground">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Add portfolio items to showcase your work</p>
                  <p className="text-xs">(optional - you can add later)</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2">
                  {portfolioItems.map((item, index) => (
                    <div key={index} className="border rounded-xl p-4 space-y-3 relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => handleRemovePortfolioItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>

                      <div className="space-y-2">
                        <Input
                          placeholder="Project title"
                          value={item.title}
                          onChange={(e) => handlePortfolioChange(index, 'title', e.target.value)}
                          className="rounded-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Textarea
                          placeholder="Brief description..."
                          value={item.description}
                          onChange={(e) => handlePortfolioChange(index, 'description', e.target.value)}
                          className="rounded-lg min-h-[60px]"
                        />
                      </div>

                      <div className="space-y-2">
                        {item.imageUrl ? (
                          <div className="relative">
                            <img 
                              src={item.imageUrl} 
                              alt="Preview" 
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="absolute bottom-2 right-2"
                              onClick={() => {
                                handlePortfolioChange(index, 'imageUrl', '');
                                handlePortfolioChange(index, 'file', undefined as any);
                              }}
                            >
                              Change
                            </Button>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center border border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileChange(index, e)}
                            />
                            <div className="text-center">
                              <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Upload image</span>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
          {/* Step content */}
          {renderStepContent()}

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
            <div>
              {currentStep > 0 ? (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={saving}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={saving}
                >
                  Skip for now
                </Button>
              )}
            </div>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={handleNext}
                className="gradient-primary text-primary-foreground"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={saving}
                className="gradient-primary text-primary-foreground"
              >
                {saving ? 'Saving...' : 'Complete Profile'} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpertOnboarding;
