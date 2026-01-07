import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Briefcase, Award, Camera, Plus, Trash2, Loader2, Circle, CheckCircle2, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { LucideProps } from 'lucide-react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Navigation from '@/components/Navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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

interface DynamicIconProps extends Omit<LucideProps, 'ref'> {
  name: string;
}

const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const iconName = name as keyof typeof dynamicIconImports;
  
  if (!dynamicIconImports[iconName]) {
    return <Circle {...props} />;
  }
  
  const LucideIcon = lazy(dynamicIconImports[iconName]);
  
  return (
    <Suspense fallback={<Circle {...props} className={cn(props.className, 'animate-pulse')} />}>
      <LucideIcon {...props} />
    </Suspense>
  );
};

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
  'student', 'skilled', 'creative', 'delivery', 'virtual', 'home_services', 'events', 'other'
];

const CATEGORY_LABELS: Record<string, string> = {
  student: 'Student Tasks',
  skilled: 'Skilled Work',
  creative: 'Creative & Design',
  delivery: 'Delivery',
  virtual: 'Virtual Assistant',
  home_services: 'Home Services',
  events: 'Events',
  other: 'Other',
  ai: 'Tech & Digital',
  custom: 'Creative & Design',
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
  
  // Add portfolio dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', category: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-6 max-w-5xl">
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
                  {isOwner && (
                    <Button variant="outline" onClick={() => navigate('/profile')}>
                      Edit Profile
                    </Button>
                  )}
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
                        {skill.icon && <DynamicIcon name={skill.icon} className="w-3.5 h-3.5" />}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {portfolio.map((item) => (
                      <Card 
                        key={item.id} 
                        className="overflow-hidden group relative cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => setSelectedImage(item)}
                      >
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
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

        {/* Image Preview Dialog */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-3xl">
            {selectedImage && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedImage.title}</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <img
                    src={selectedImage.image_url}
                    alt={selectedImage.title}
                    className="w-full rounded-lg"
                  />
                  {selectedImage.description && (
                    <p className="mt-4 text-muted-foreground">{selectedImage.description}</p>
                  )}
                  {selectedImage.category && (
                    <Badge variant="outline" className="mt-2">
                      {getCategoryLabel(selectedImage.category)}
                    </Badge>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default DoerProfile;
