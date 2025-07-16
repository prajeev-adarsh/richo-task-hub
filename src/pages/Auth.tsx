import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/components/LanguageContext';
import { useUser } from '@/components/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, LogIn, Globe, Mail } from 'lucide-react';

type UserRole = 'client' | 'doer';
type UserLanguage = 'en' | 'te' | 'hi';

const Auth = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Signup form state
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '' as UserRole,
    language: language as UserLanguage,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch user profile to get role for redirect
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('auth_user_id', data.user.id)
          .single();

        const role = profile?.role;
        if (role === 'client') navigate('/client-dashboard');
        else if (role === 'doer') navigate('/doer-dashboard');
        else if (role === 'admin') navigate('/admin-dashboard');
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
    
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (!signupData.role) {
      toast({
        title: "Role required",
        description: "Please select your role",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Starting signup process...');
      
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error('Auth signup error:', error);
        throw error;
      }

      if (data.user) {
        console.log('User created, creating profile...', data.user.id);
        
        // Create user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            auth_user_id: data.user.id,
            name: signupData.name,
            email: signupData.email,
            phone: signupData.phone,
            role: signupData.role,
            language: signupData.language,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }

        console.log('Profile created successfully');
        
        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account.",
        });

        // Redirect based on role
        if (signupData.role === 'client') navigate('/client-dashboard');
        else if (signupData.role === 'doer') navigate('/doer-dashboard');
        else navigate('/');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      let errorMessage = error.message;
      
      // Handle specific error types
      if (error.message?.includes('row-level security')) {
        errorMessage = "Unable to create account. Please try again.";
      } else if (error.message?.includes('duplicate key')) {
        errorMessage = "An account with this email already exists.";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">R</span>
            </div>
            <h1 className="text-4xl font-bold text-gradient">Richo</h1>
          </div>
          <p className="text-muted-foreground">{t('tagline')}</p>
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

        {/* Auth Tabs */}
        <Tabs defaultValue="login" className="w-full">
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
                <CardTitle>Create your account</CardTitle>
                <CardDescription>Join Richo to start posting or completing tasks</CardDescription>
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
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      value={signupData.phone}
                      onChange={(e) => setSignupData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter your phone number"
                      className="rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Role</Label>
                    <Select
                      value={signupData.role}
                      onValueChange={(value: UserRole) => setSignupData(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger className="rounded-2xl">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client - Post tasks</SelectItem>
                        <SelectItem value="doer">Doer - Complete tasks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

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
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;