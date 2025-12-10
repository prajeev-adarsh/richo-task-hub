import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Briefcase, Award, Camera, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Navigation from '@/components/Navigation';

interface DoerProfileData {
  id: string;
  name: string;
  photo_url: string | null;
  skills: string[];
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

const DoerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<DoerProfileData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  
  // Add portfolio dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', category: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (id) {
      fetchProfile();
      fetchPortfolio();
      fetchReviews();
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
        setProfile(data[0]);
      }
    } catch (error) {
      logger.error('Error fetching doer profile:', error);
    } finally {
      setLoading(false);
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
      // Upload image
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(fileName);

      // Create portfolio item
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
    const labels: Record<string, string> = {
      student: 'Student Tasks',
      skilled: 'Skilled Work',
      creative: 'Creative',
      delivery: 'Delivery',
      virtual: 'Virtual',
      home_services: 'Home Services',
      events: 'Events',
      other: 'Other',
    };
    return labels[category] || category;
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
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.photo_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {profile.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{profile.avg_rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({profile.total_reviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span>{profile.completed_tasks} tasks completed</span>
                  </div>
                </div>

                {/* Skills */}
                {profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {profile.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {getCategoryLabel(skill)}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio Section */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Portfolio
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
              <p className="text-muted-foreground text-center py-8">
                {isOwner ? 'Add your work samples to showcase your skills!' : 'No portfolio items yet'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolio.map((item) => (
                  <Card key={item.id} className="overflow-hidden group relative">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-48 object-cover"
                    />
                    <CardContent className="p-3">
                      <h4 className="font-medium">{item.title}</h4>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
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
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeletePortfolioItem(item.id)}
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

        {/* Reviews Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b last:border-b-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{review.from_user_name}</span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.stars
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      For: {review.task_title}
                    </p>
                    {review.review && (
                      <p className="text-sm mt-2">{review.review}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DoerProfile;