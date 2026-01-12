import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, LogIn, Globe, Mail, CheckCircle, ArrowLeft, Sparkles, Brain } from 'lucide-react';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';

// Validation schemas
const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().trim().email('Invalid email format').max(255, 'Email must be less than 255 characters'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  role: z.enum(['client', 'doer'], { required_error: 'Please select your role' }),
  language: z.enum(['en', 'te', 'hi']),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type UserRole = 'client' | 'doer';
type UserLanguage = 'en' | 'te' | 'hi';

interface AuthProps {
  defaultRole?: UserRole;
}

const Auth = ({ defaultRole }: AuthProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  // Determine role from route
  const getRoleFromPath = (): UserRole | undefined => {
    if (defaultRole) return defaultRole;
    if (location.pathname === '/auth/client') return 'client';
    if (location.pathname === '/auth/expert') return 'doer';
    return undefined;
  };

  const presetRole = getRoleFromPath();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Password reset mode state
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Email verification state
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // Signup form state
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: (presetRole || '') as UserRole,
    language: language as UserLanguage,
  });

  // Update role when preset role changes
  useEffect(() => {
    if (presetRole) {
      setSignupData(prev => ({ ...prev, role: presetRole }));
    }
  }, [presetRole]);

  // Detect password reset sessions
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordResetMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been successfully updated.",
      });

      // Reset form and redirect
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordResetMode(false);
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate login data
    const loginValidation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!loginValidation.success) {
      toast({
        title: "Validation Error",
        description: loginValidation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        // Check if this is an invalid credentials error
        if (error.message === 'Invalid login credentials') {
          // Check if the email exists in the users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', loginEmail.trim().toLowerCase())
            .maybeSingle();

          if (!existingUser) {
            // Email doesn't exist - prompt to sign up
            toast({
              title: "No account found",
              description: "This email isn't registered. Create a new account to get started.",
              variant: "destructive",
            });
            // Pre-fill email and switch to signup tab
            setSignupData(prev => ({ ...prev, email: loginEmail.trim() }));
            setActiveTab('signup');
            setIsLoading(false);
            return;
          } else {
            // Email exists but password is wrong
            toast({
              title: "Incorrect password",
              description: "The password you entered is incorrect. Please try again or reset your password.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }
        throw error;
      }

      if (data.user) {
        // Fetch user profile to get active_role for redirect
        const { data: profile } = await supabase
          .from('users')
          .select('active_role')
          .eq('auth_user_id', data.user.id)
          .single();

        const activeRole = profile?.active_role;
        if (activeRole === 'client') navigate('/client-dashboard');
        else if (activeRole === 'doer') navigate('/doer-dashboard');
        else if (activeRole === 'admin') navigate('/admin-dashboard');
        else navigate('/');
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate signup data using Zod
    const validation = signupSchema.safeParse(signupData);
    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      logger.info('Starting signup process...');
      
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email.trim(),
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        logger.error('Auth signup error:', error);
        throw error;
      }

      if (data.user) {
        logger.info('User created, creating profile...', data.user.id);
        
        // Create user profile with trimmed and validated data
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            auth_user_id: data.user.id,
            name: signupData.name.trim(),
            email: signupData.email.trim().toLowerCase(),
            phone: signupData.phone?.trim() || null,
            role: signupData.role,
            active_role: signupData.role,
            language: signupData.language,
          });

        if (profileError) {
          logger.error('Profile creation error:', profileError);
          throw profileError;
        }

        // Add role to user_roles table
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: signupData.role,
          });

        if (roleError) {
          logger.error('Role creation error:', roleError);
          throw roleError;
        }

        logger.info('Profile and role created successfully');
        
        // Show email verification screen instead of redirecting
        setVerificationEmail(signupData.email.trim());
        setShowVerificationScreen(true);
      }
    } catch (error: any) {
      logger.error('Signup error:', error);
      
      let errorMessage = error.message;
      
      // Handle specific error types
      if (error.message?.includes('row-level security')) {
        errorMessage = "Unable to create account. Please try again.";
      } else if (error.message?.includes('duplicate key') || error.message?.includes('already registered')) {
        errorMessage = "An account with this email already exists. Please login instead.";
        setLoginEmail(signupData.email.trim());
        setActiveTab('login');
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      
      toast({
        title: "Signup failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    setIsResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;

      toast({
        title: "Email sent!",
        description: "A new verification email has been sent to your inbox.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Reset email sent",
        description: "Check your email for password reset instructions.",
      });

      setForgotPasswordOpen(false);
      setResetEmail('');
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'te', label: 'తెలుగు' },
    { value: 'hi', label: 'हिंदी' },
  ];

  // Get role-specific content
  const getRoleContent = () => {
    if (presetRole === 'client') {
      return {
        icon: Sparkles,
        title: 'Hire Top AI Talent',
        description: 'Create your free account to post projects and connect with vetted AI experts',
        signupTitle: 'Create Client Account',
        signupDescription: 'Start hiring AI experts for your projects',
      };
    } else if (presetRole === 'doer') {
      return {
        icon: Brain,
        title: 'Join as AI Expert',
        description: 'Showcase your AI skills and get discovered by clients worldwide',
        signupTitle: 'Create Expert Account',
        signupDescription: 'Start earning by completing AI projects',
      };
    }
    return {
      icon: null,
      title: 'Welcome to Richo',
      description: t('tagline'),
      signupTitle: 'Create your account',
      signupDescription: 'Join Richo to start posting or completing projects',
    };
  };

  const roleContent = getRoleContent();
  const RoleIcon = roleContent.icon;

  // Email verification screen
  if (showVerificationScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="rounded-2xl text-center">
            <CardHeader className="pb-4">
              <div className="w-20 h-20 bg-success/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription className="text-base mt-2">
                We've sent a verification link to:
              </CardDescription>
              <p className="font-semibold text-foreground mt-2">{verificationEmail}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click the link in the email to verify your account. 
                Once verified, you can log in and start using Richo.
              </p>
              
              <div className="pt-4 space-y-3">
                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={handleResendVerificationEmail}
                  disabled={isResendingEmail}
                >
                  {isResendingEmail ? 'Sending...' : "Didn't receive it? Resend Email"}
                </Button>
                
                <Button
                  className="w-full rounded-2xl"
                  onClick={() => {
                    setShowVerificationScreen(false);
                    setLoginEmail(verificationEmail);
                    setActiveTab('login');
                  }}
                >
                  Already verified? Login here
                </Button>
              </div>

              <div className="pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="text-muted-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button for role-specific pages */}
        {presetRole && (
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            {RoleIcon ? (
              <div className={`w-12 h-12 ${presetRole === 'client' ? 'bg-primary/10' : 'bg-accent/10'} rounded-2xl flex items-center justify-center`}>
                <RoleIcon className={`h-6 w-6 ${presetRole === 'client' ? 'text-primary' : 'text-accent'}`} />
              </div>
            ) : (
              <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">R</span>
              </div>
            )}
            <h1 className="text-4xl font-bold text-gradient">Richo</h1>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">{roleContent.title}</h2>
          <p className="text-muted-foreground">{roleContent.description}</p>
        </div>

        {/* Language Selector */}
        <div className="flex justify-center mb-6">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
            onClick={() => {
              const languages: UserLanguage[] = ['en', 'te', 'hi'];
              const currentIndex = languages.indexOf(language as UserLanguage);
              const nextIndex = (currentIndex + 1) % languages.length;
              setLanguage(languages[nextIndex]);
              setSignupData(prev => ({ ...prev, language: languages[nextIndex] }));
            }}
          >
            <Globe className="h-4 w-4" />
            <span className="uppercase">{language}</span>
          </Button>
        </div>

        {/* Password Reset Mode or Auth Tabs */}
        {isPasswordResetMode ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Set New Password</CardTitle>
              <CardDescription>Enter your new password to complete the reset</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    required
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    className="rounded-2xl"
                  />
                </div>
                <Button type="submit" className="w-full rounded-2xl" disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? 'Updating password...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-2xl">
              <TabsTrigger value="login" className="rounded-2xl">
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-2xl">
                <UserPlus className="h-4 w-4 mr-2" />
                Sign Up
              </TabsTrigger>
            </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Sign in to your account to continue</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      className="rounded-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="rounded-2xl"
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-2xl" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <GoogleAuthButton mode="login" role={presetRole} />
                  
                  <div className="text-center">
                    <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          type="button" 
                          variant="link" 
                          className="text-sm text-muted-foreground hover:text-primary"
                        >
                          Forgot password?
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center space-x-2">
                            <Mail className="h-5 w-5" />
                            <span>Reset Password</span>
                          </DialogTitle>
                          <DialogDescription>
                            Enter your email address and we'll send you a link to reset your password.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="reset-email">Email</Label>
                            <Input
                              id="reset-email"
                              type="email"
                              value={resetEmail}
                              onChange={(e) => setResetEmail(e.target.value)}
                              placeholder="Enter your email"
                              required
                              className="rounded-2xl"
                            />
                          </div>
                          <Button 
                            type="submit" 
                            className="w-full rounded-2xl" 
                            disabled={isResetting}
                          >
                            {isResetting ? 'Sending...' : 'Send Reset Link'}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signup Tab */}
          <TabsContent value="signup">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>{roleContent.signupTitle}</CardTitle>
                <CardDescription>{roleContent.signupDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={signupData.name}
                      onChange={(e) => setSignupData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                      className="rounded-2xl"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email"
                      required
                      className="rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">
                      Phone Number <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      value={signupData.phone}
                      onChange={(e) => setSignupData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      className="rounded-2xl"
                    />
                  </div>

                  {/* Only show role selector if no preset role */}
                  {!presetRole && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-role">I want to</Label>
                      <Select
                        value={signupData.role}
                        onValueChange={(value: UserRole) => setSignupData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger className="rounded-2xl">
                          <SelectValue placeholder="Select how you'll use Richo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Hire AI Experts for my projects</SelectItem>
                          <SelectItem value="doer">Offer my AI expertise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="signup-language">Language Preference</Label>
                    <Select
                      value={signupData.language}
                      onValueChange={(value: UserLanguage) => setSignupData(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Create a password"
                      required
                      className="rounded-2xl"
                    />
                    <p className="text-xs text-muted-foreground">
                      Min 8 characters, 1 uppercase, 1 number
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm your password"
                      required
                      className="rounded-2xl"
                    />
                  </div>

                  <Button type="submit" className="w-full rounded-2xl" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <GoogleAuthButton mode="signup" role={presetRole} />
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}
      </div>
    </div>
  );
};

export default Auth;
