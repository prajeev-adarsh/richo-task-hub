import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Brain, Shield, Zap, Code, Video, Bot } from 'lucide-react';

const RoleSelector = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleGetStarted = (role?: string) => {
    navigate('/auth');
  };

  const roles = [
    {
      role: 'client',
      icon: Sparkles,
      title: t('client'),
      description: t('clientTagline'),
      buttonText: t('findAITalent'),
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      isPrimary: true,
    },
    {
      role: 'doer',
      icon: Brain,
      title: t('expert'),
      description: t('expertTagline'),
      buttonText: t('joinAsExpert'),
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      isPrimary: false,
    },
    {
      role: 'admin',
      icon: Shield,
      title: t('admin'),
      description: 'Manage platform and users',
      buttonText: t('getStarted'),
      color: 'text-success',
      bgColor: 'bg-success/10',
      isPrimary: false,
    },
  ];

  const aiCategories = [
    { icon: Bot, label: 'AI Workflows' },
    { icon: Code, label: 'Vibe Coding' },
    { icon: Brain, label: 'Prompt Engineering' },
    { icon: Video, label: 'AI Video Editing' },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-5xl relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center glow-primary animate-pulse-glow">
              <Zap className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gradient">Richo</h1>
          </div>

          {/* Main Headline */}
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('heroHeadline')}
          </h2>

          {/* Sub-headline */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
            {t('heroSubheadline')}
          </p>

          {/* AI Categories Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {aiCategories.map((category, index) => {
              const IconComponent = category.icon;
              return (
                <div
                  key={category.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-card/50 backdrop-blur-sm hover:border-primary/40 hover:glow-primary transition-all duration-300 cursor-default"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <IconComponent className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{category.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((roleOption) => {
            const IconComponent = roleOption.icon;
            return (
              <Card
                key={roleOption.role}
                className={`cursor-pointer transition-all duration-300 rounded-2xl border-2 card-futuristic hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 ${
                  roleOption.isPrimary ? 'border-primary/30 glow-primary' : 'border-border'
                }`}
                onClick={() => handleGetStarted(roleOption.role)}
              >
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 ${roleOption.bgColor} rounded-2xl mx-auto mb-4 flex items-center justify-center transition-transform hover:scale-110`}>
                    <IconComponent className={`h-8 w-8 ${roleOption.color}`} />
                  </div>
                  <CardTitle className="text-xl">{roleOption.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {roleOption.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    className={`w-full rounded-xl font-semibold ${
                      roleOption.isPrimary 
                        ? 'gradient-primary text-primary-foreground hover:opacity-90' 
                        : ''
                    }`}
                    variant={roleOption.isPrimary ? 'default' : 'secondary'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGetStarted(roleOption.role);
                    }}
                  >
                    {roleOption.buttonText}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            {t('trustedBy')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;
