import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Briefcase, Award, Camera, Plus, Trash2, Loader2, CheckCircle2, Calendar, TrendingUp, Share2, Copy, MessageCircle, Check, ChevronLeft, ChevronRight, Grid, Image } from 'lucide-react';
import { SkillIcon } from '@/lib/skillIcons';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Navigation from '@/components/Navigation';
import { format } from 'date-fns';
import SEO from '@/components/SEO';

interface SkillData {
  name: string;
  icon: string | null;
}

interface DoerProfileData {
  id: string;
  name: string;
  photo_url: string | null;
  skills: SkillData[];
  avg_rating: number;
  total_reviews: number;
  completed_tasks: number;
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string | null;
  created_at: string;
}

interface CompletedTask {
  id: string;
  title: string;
  category: string;
  budget: number;
  completed_at: string;
  client_name: string;
}

interface Review {
  id: string;
  stars: number;
  review: string | null;
  created_at: string;
  from_user_name: string;
  task_title: string;
}

const CATEGORIES = [
  'ai_workflows', 'vibe_coding', 'prompt_engineering', 'ai_video', 'web_design', 'general'
];

const CATEGORY_LABELS: Record<string, string> = {
  ai_workflows: 'AI Workflows & Automation',
  vibe_coding: 'Vibe Coding',
  prompt_engineering: 'Prompt Engineering',
  ai_video: 'AI Video Editing',
  web_design: 'Web Design',
  general: 'General',
};

const DoerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<DoerProfileData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [selectedImage, setSelectedImage] = useState<PortfolioItem | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [galleryView, setGalleryView] = useState<'grid' | 'carousel'>('grid');
  
  // Add portfolio dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', category: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Share and contact state
  const [linkCopied, setLinkCopied] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const profileUrl = `${window.location.origin}/doer/${id}`;

  useEffect(() => {
    if (id) {
      Promise.all([
        fetchProfile(),
        fetchPortfolio(),
        fetchReviews(),
        fetchCompletedTasks()
      ]).finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    setIsOwner(user?.id === id);
  }, [user, id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.rpc('get_doer_profile', { _user_id: id });
      if (error) throw error;
      if (data && data.length > 0) {
        const profileData = data[0];
        const rawSkills = profileData.skills;
        const skills: SkillData[] = Array.isArray(rawSkills) 
          ? (rawSkills as unknown as SkillData[])
          : [];
        setProfile({
          id: profileData.id,
          name: profileData.name,
          photo_url: profileData.photo_url,
          avg_rating: profileData.avg_rating,
          total_reviews: profileData.total_reviews,
          completed_tasks: profileData.completed_tasks,
          skills
        });
      }
    } catch (error) {
      logger.error('Error fetching doer profile:', error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_items')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPortfolio(data || []);
    } catch (error) {
      logger.error('Error fetching portfolio:', error);
    }
  };

  const fetchCompletedTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          category,
          budget,
          created_at,
          client:users_public!tasks_client_id_fkey(name)
        `)
        .eq('doer_id', id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      const formatted = (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        budget: t.budget,
        completed_at: t.created_at,
        client_name: t.client?.name || 'Client',
      }));
      
      setCompletedTasks(formatted);
    } catch (error) {
      logger.error('Error fetching completed tasks:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('ratings')
        .select(`
          id,
          stars,
          review,
          created_at,
          task:tasks(title),
          from_user:users!ratings_from_user_fkey(name)
        `)
        .eq('to_user', id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      const formattedReviews = (data || []).map((r: any) => ({
        id: r.id,
        stars: r.stars,
        review: r.review,
        created_at: r.created_at,
        from_user_name: r.from_user?.name || 'Anonymous',
        task_title: r.task?.title || 'Task',
      }));
      
      setReviews(formattedReviews);
    } catch (error) {
      logger.error('Error fetching reviews:', error);
    }
  };

  const handleAddPortfolioItem = async () => {
    if (!selectedFile || !newItem.title) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(fileName);

      const insertData: any = {
        user_id: user?.id,
        title: newItem.title,
        description: newItem.description || null,
        image_url: publicUrl,
      };
      if (newItem.category) {
        insertData.category = newItem.category;
      }

      const { error: insertError } = await supabase
        .from('portfolio_items')
        .insert(insertData);

      if (insertError) throw insertError;

      toast({ title: 'Portfolio item added!' });
      setShowAddDialog(false);
      setNewItem({ title: '', description: '', category: '' });
      setSelectedFile(null);
      fetchPortfolio();
    } catch (error) {
      logger.error('Error adding portfolio item:', error);
      toast({ title: 'Failed to add item', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePortfolioItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast({ title: 'Item deleted' });
      fetchPortfolio();
    } catch (error) {
      logger.error('Error deleting portfolio item:', error);
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORY_LABELS[category] || category;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setLinkCopied(true);
      toast({ title: 'Link copied to clipboard!' });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy link', variant: 'destructive' });
    }
  };

  const handleShareToSocial = (platform: 'twitter' | 'linkedin' | 'whatsapp' | 'facebook') => {
    const text = `Check out ${profile?.name}'s portfolio on Richo!`;
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${profileUrl}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`,
    };
    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  const handleSendMessage = async () => {
    if (!contactMessage.trim() || !user) {
      toast({ title: 'Please enter a message', variant: 'destructive' });
      return;
    }

    if (contactMessage.trim().length < 10) {
      toast({ title: 'Message must be at least 10 characters', variant: 'destructive' });
      return;
    }

    setSendingMessage(true);
    try {
      // Use the secure send_contact_message function with rate limiting
      const { error } = await supabase.rpc('send_contact_message', {
        p_doer_id: id as string,
        p_message: contactMessage.trim()
      });

      if (error) {
        // Handle specific error messages from the RPC
        if (error.message.includes('Rate limit')) {
          toast({ title: 'Too many messages', description: 'Please wait before sending more messages.', variant: 'destructive' });
        } else if (error.message.includes('2 messages per day')) {
          toast({ title: 'Daily limit reached', description: 'You can only send 2 messages per day to the same expert.', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: 'Message sent successfully!' });
      setShowContactDialog(false);
      setContactMessage('');
    } catch (error) {
      logger.error('Error sending message:', error);
      toast({ title: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Doer profile not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  const skillNames = profile.skills.map((s) => s.name).filter(Boolean).slice(0, 5).join(', ');
  const seoDesc = `${profile.name} — AI expert on Richo${skillNames ? ` specialising in ${skillNames}` : ''}. ${profile.completed_tasks} completed tasks, ${profile.total_reviews} reviews. Hire vetted AI talent.`.slice(0, 160);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${profile.name} — AI Expert on Richo`}
        description={seoDesc}
        path={`/doer/${profile.id}`}
      />
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Hero Profile Header */}
        <Card className="mb-6 overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <Avatar className="h-28 w-28 ring-4 ring-background shadow-xl">
                <AvatarImage src={profile.photo_url || undefined} />
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground font-bold">
                  {profile.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">{profile.name}</h1>
                    <p className="text-muted-foreground mt-1">Professional Doer</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Share Button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={handleCopyLink}>
                          {linkCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                          {linkCopied ? 'Copied!' : 'Copy Link'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareToSocial('whatsapp')}>
                          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareToSocial('twitter')}>
                          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          Twitter / X
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareToSocial('linkedin')}>
                          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShareToSocial('facebook')}>
                          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {isOwner ? (
                      <Button variant="outline" size="sm" onClick={() => navigate('/profile')}>
                        Edit Profile
                      </Button>
                    ) : user && user.role !== 'doer' && (
                      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-primary hover:bg-primary/90">
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Hire Me
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Contact {profile.name}</DialogTitle>
                            <DialogDescription>
                              Send a message to discuss your project or request a quote.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <Textarea
                              placeholder="Hi! I'm interested in hiring you for a project. I need help with..."
                              value={contactMessage}
                              onChange={(e) => setContactMessage(e.target.value)}
                              rows={4}
                            />
                            <div className="flex gap-2">
                              <Button 
                                onClick={handleSendMessage} 
                                disabled={sendingMessage || !contactMessage.trim()}
                                className="flex-1"
                              >
                                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Send Message
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => navigate('/post-task')}
                              >
                                Post a Task
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>

                {/* Skills */}
                {profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {profile.skills.map((skill) => (
                      <Badge 
                        key={skill.name} 
                        variant="secondary" 
                        className="flex items-center gap-1.5 px-3 py-1 bg-background/80 backdrop-blur-sm"
                      >
                        {skill.icon && <SkillIcon name={skill.icon} className="w-3.5 h-3.5" />}
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-yellow-100">
                <Star className="h-5 w-5 text-yellow-600 fill-yellow-500" />
              </div>
              <p className="text-2xl font-bold">{profile.avg_rating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avg. Rating</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{profile.completed_tasks}</p>
              <p className="text-xs text-muted-foreground">Tasks Done</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-blue-100">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{profile.total_reviews}</p>
              <p className="text-xs text-muted-foreground">Reviews</p>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-md">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-full bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold">{portfolio.length}</p>
              <p className="text-xs text-muted-foreground">Portfolio Items</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="portfolio" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Portfolio</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Completed Work</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Reviews</span>
            </TabsTrigger>
          </TabsList>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio">
            <Card className="border-0 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Portfolio Showcase
                </CardTitle>
                {isOwner && (
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Work
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Portfolio Item</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <Input
                          placeholder="Title *"
                          value={newItem.title}
                          onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                        />
                        <Textarea
                          placeholder="Description (optional)"
                          value={newItem.description}
                          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        />
                        <Select
                          value={newItem.category}
                          onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {getCategoryLabel(cat)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                        <Button 
                          onClick={handleAddPortfolioItem} 
                          disabled={uploading}
                          className="w-full"
                        >
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Add Item
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {portfolio.length === 0 ? (
                  <div className="text-center py-12">
                    <Camera className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {isOwner ? 'Add your work samples to showcase your skills!' : 'No portfolio items yet'}
                    </p>
                    {isOwner && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setShowAddDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Work
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* View Toggle */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {portfolio.length} work sample{portfolio.length !== 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                        <Button
                          variant={galleryView === 'grid' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-8 px-3"
                          onClick={() => setGalleryView('grid')}
                        >
                          <Grid className="h-4 w-4 mr-1.5" />
                          Grid
                        </Button>
                        <Button
                          variant={galleryView === 'carousel' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-8 px-3"
                          onClick={() => setGalleryView('carousel')}
                        >
                          <Image className="h-4 w-4 mr-1.5" />
                          Gallery
                        </Button>
                      </div>
                    </div>

                    {galleryView === 'grid' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {portfolio.map((item, index) => (
                          <Card 
                            key={item.id} 
                            className="overflow-hidden group relative cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => {
                              setSelectedImage(item);
                              setSelectedImageIndex(index);
                            }}
                          >
                            <OptimizedImage
                              src={item.image_url}
                              alt={item.title}
                              aspectRatio="video"
                              className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                            />
                            <CardContent className="p-4">
                              <h4 className="font-semibold">{item.title}</h4>
                              {item.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{item.description}</p>
                              )}
                              {item.category && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {getCategoryLabel(item.category)}
                                </Badge>
                              )}
                            </CardContent>
                            {isOwner && (
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePortfolioItem(item.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      /* Carousel Gallery View */
                      <div className="relative">
                        <div className="overflow-hidden rounded-xl">
                          <div 
                            className="relative aspect-video cursor-pointer"
                            onClick={() => {
                              setSelectedImage(portfolio[selectedImageIndex]);
                            }}
                          >
                            <img
                              src={portfolio[selectedImageIndex]?.image_url}
                              alt={portfolio[selectedImageIndex]?.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                              <h3 className="text-xl font-bold">{portfolio[selectedImageIndex]?.title}</h3>
                              {portfolio[selectedImageIndex]?.description && (
                                <p className="text-sm text-white/80 mt-1 line-clamp-2">
                                  {portfolio[selectedImageIndex]?.description}
                                </p>
                              )}
                              {portfolio[selectedImageIndex]?.category && (
                                <Badge variant="secondary" className="mt-2">
                                  {getCategoryLabel(portfolio[selectedImageIndex]?.category || '')}
                                </Badge>
                              )}
                            </div>
                            {isOwner && (
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-4 right-4 h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePortfolioItem(portfolio[selectedImageIndex].id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Navigation Buttons */}
                        {portfolio.length > 1 && (
                          <>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg"
                              onClick={() => setSelectedImageIndex((prev) => 
                                prev === 0 ? portfolio.length - 1 : prev - 1
                              )}
                            >
                              <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg"
                              onClick={() => setSelectedImageIndex((prev) => 
                                prev === portfolio.length - 1 ? 0 : prev + 1
                              )}
                            >
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </>
                        )}

                        {/* Thumbnail Strip */}
                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                          {portfolio.map((item, index) => (
                            <button
                              key={item.id}
                              className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden ring-2 transition-all ${
                                index === selectedImageIndex 
                                  ? 'ring-primary ring-offset-2' 
                                  : 'ring-transparent hover:ring-muted-foreground/30'
                              }`}
                              onClick={() => setSelectedImageIndex(index)}
                            >
                              <img
                                src={item.image_url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Completed Work Tab */}
          <TabsContent value="completed">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Completed Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No completed tasks yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{task.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(task.completed_at), 'MMM d, yyyy')}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {getCategoryLabel(task.category)}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold text-primary">₹{task.budget}</p>
                          <p className="text-xs text-muted-foreground">for {task.client_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Client Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No reviews yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="p-4 rounded-lg bg-muted/50">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-semibold">{review.from_user_name}</span>
                            <p className="text-sm text-muted-foreground">
                              For: {review.task_title}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.stars
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-muted-foreground/30'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.review && (
                          <p className="text-sm mt-3">{review.review}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(review.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Image Preview Dialog with Navigation */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            {selectedImage && (
              <div className="relative">
                {/* Close handled by DialogContent */}
                <div className="relative">
                  <img
                    src={selectedImage.image_url}
                    alt={selectedImage.title}
                    className="w-full max-h-[70vh] object-contain bg-black"
                  />
                  
                  {/* Navigation Arrows */}
                  {portfolio.length > 1 && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
                        onClick={() => {
                          const newIndex = selectedImageIndex === 0 ? portfolio.length - 1 : selectedImageIndex - 1;
                          setSelectedImageIndex(newIndex);
                          setSelectedImage(portfolio[newIndex]);
                        }}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
                        onClick={() => {
                          const newIndex = selectedImageIndex === portfolio.length - 1 ? 0 : selectedImageIndex + 1;
                          setSelectedImageIndex(newIndex);
                          setSelectedImage(portfolio[newIndex]);
                        }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </>
                  )}
                </div>
                
                {/* Details Section */}
                <div className="p-6 bg-background">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{selectedImage.title}</h3>
                      {selectedImage.description && (
                        <p className="mt-2 text-muted-foreground">{selectedImage.description}</p>
                      )}
                      {selectedImage.category && (
                        <Badge variant="outline" className="mt-3">
                          {getCategoryLabel(selectedImage.category)}
                        </Badge>
                      )}
                    </div>
                    {portfolio.length > 1 && (
                      <span className="text-sm text-muted-foreground">
                        {selectedImageIndex + 1} / {portfolio.length}
                      </span>
                    )}
      </main>
    </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DoerProfile;
