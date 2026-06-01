import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/components/UserContext';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/Navigation';
import SEO from '@/components/SEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  DollarSign, 
  Briefcase,
  MessageSquare,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2
} from 'lucide-react';
import { logger } from '@/lib/logger';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Expert {
  id: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  availability: string | null;
  hourly_rate: number | null;
  skills: { id: string; name: string; category: string }[];
  avg_rating: number;
  completed_tasks: number;
  total_reviews: number;
}

interface Skill {
  id: string;
  name: string;
  category: string;
}

const AVAILABILITY_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  weekends: 'Weekends',
  flexible: 'Flexible',
};

const ExpertDiscovery = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role, user } = useUser();
  const { toast } = useToast();
  const [experts, setExperts] = useState<Expert[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string>('all');
  const [maxRate, setMaxRate] = useState<number>(200);
  const [minRating, setMinRating] = useState<number>(0);

  // Contact expert state
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchSkills();
    fetchExperts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExperts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedSkills, availability, maxRate, minRating]);

  const fetchSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('id, name, category')
        .order('category, name');

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      logger.error('Error fetching skills:', error);
    }
  };

  const fetchExperts = async () => {
    setLoading(true);
    try {
      // Sanitize search input
      let sanitizedSearch: string | null = null;
      if (searchQuery.trim()) {
        sanitizedSearch = searchQuery.trim()
          .replace(/[,()[\]<>=.%_\\]/g, '')
          .slice(0, 100);
        if (sanitizedSearch.length === 0) sanitizedSearch = null;
      }

      // Use secure RPC that doesn't expose PII
      const { data: doers, error: doersError } = await supabase.rpc('search_experts', {
        p_search: sanitizedSearch,
        p_availability: availability !== 'all' ? availability : null,
        p_max_rate: maxRate < 200 ? maxRate : null,
      });

      if (doersError) throw doersError;

      // Get ratings for all doers
      const doerIds = (doers || []).map((d: any) => d.id);
      const { data: ratings, error: ratingsError } = await supabase
        .from('ratings')
        .select('to_user, stars')
        .in('to_user', doerIds);

      if (ratingsError) throw ratingsError;

      // Get completed task counts
      const { data: taskCounts, error: tasksError } = await supabase
        .from('tasks')
        .select('doer_id')
        .in('doer_id', doerIds)
        .eq('status', 'completed');

      if (tasksError) throw tasksError;
      // Build expert data - skills come from RPC as JSON
      const expertData: Expert[] = (doers || []).map((doer: any) => {
        const doerRatings = (ratings || []).filter(r => r.to_user === doer.id);
        const avgRating = doerRatings.length > 0
          ? doerRatings.reduce((sum, r) => sum + r.stars, 0) / doerRatings.length
          : 0;
        const completedTasks = (taskCounts || []).filter(t => t.doer_id === doer.id).length;

        // Skills already come as JSON array from the RPC
        const expertSkills = Array.isArray(doer.skills) ? doer.skills : [];

        return {
          id: doer.id,
          name: doer.name,
          photo_url: doer.photo_url,
          bio: doer.bio,
          availability: doer.availability,
          hourly_rate: doer.hourly_rate,
          skills: expertSkills,
          avg_rating: avgRating,
          completed_tasks: completedTasks,
          total_reviews: doerRatings.length,
        };
      });

      // Filter by selected skills
      let filtered = expertData;
      if (selectedSkills.length > 0) {
        filtered = expertData.filter(expert =>
          expert.skills.some(skill => selectedSkills.includes(skill.id))
        );
      }

      // Filter by min rating
      if (minRating > 0) {
        filtered = filtered.filter(expert => expert.avg_rating >= minRating);
      }

      // Sort by rating and completed tasks
      filtered.sort((a, b) => {
        if (b.avg_rating !== a.avg_rating) return b.avg_rating - a.avg_rating;
        return b.completed_tasks - a.completed_tasks;
      });

      setExperts(filtered);
    } catch (error) {
      logger.error('Error fetching experts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSkills([]);
    setAvailability('all');
    setMaxRate(200);
    setMinRating(0);
  };

  const hasActiveFilters = selectedSkills.length > 0 || availability !== 'all' || maxRate < 200 || minRating > 0;

  const handleOpenContactDialog = (expert: Expert, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/auth/client');
      return;
    }
    if (user?.id === expert.id) {
      toast({ title: "You can't contact yourself", variant: 'destructive' });
      return;
    }
    setSelectedExpert(expert);
    setContactMessage('');
    setContactDialogOpen(true);
  };

  const handleSendContactMessage = async () => {
    if (!contactMessage.trim() || !selectedExpert || !user) {
      toast({ title: 'Please enter a message', variant: 'destructive' });
      return;
    }

    if (contactMessage.trim().length < 10) {
      toast({ title: 'Message must be at least 10 characters', variant: 'destructive' });
      return;
    }

    setSendingMessage(true);
    try {
      const { error } = await supabase.rpc('send_contact_message', {
        p_doer_id: selectedExpert.id,
        p_message: contactMessage.trim()
      });

      if (error) {
        if (error.message.includes('Rate limit')) {
          toast({ title: 'Too many messages', description: 'Please wait before sending more messages.', variant: 'destructive' });
        } else if (error.message.includes('2 messages per day')) {
          toast({ title: 'Daily limit reached', description: 'You can only send 2 messages per day to the same expert.', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: 'Message sent!', description: `Your message was sent to ${selectedExpert.name}` });
      setContactDialogOpen(false);
      setContactMessage('');
      setSelectedExpert(null);
    } catch (error) {
      logger.error('Error sending contact message:', error);
      toast({ title: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleViewProfile = (expertId: string) => {
    navigate(`/doer/${expertId}`);
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Find AI Experts | Richo"
        description="Browse vetted AI freelancers on Richo — prompt engineers, vibe coders, automation experts and AI video editors ready to hire."
        path="/find-experts"
      />
      <Navigation />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Find AI Experts</h1>
          <p className="text-muted-foreground">
            Browse and connect with vetted AI professionals for your projects
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-8">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search experts by name or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <Button
              variant="outline"
              className="rounded-xl flex items-center gap-2"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground">
                  {selectedSkills.length + (availability !== 'all' ? 1 : 0) + (maxRate < 200 ? 1 : 0) + (minRating > 0 ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleContent>
              <Card className="rounded-xl">
                <CardContent className="p-4 space-y-6">
                  {/* Skills Filter */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Skills</label>
                      {selectedSkills.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSkills([])}
                          className="h-auto py-1 px-2 text-xs"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <ScrollArea className="h-32">
                      <div className="flex flex-wrap gap-2">
                        {skills.map(skill => (
                          <Badge
                            key={skill.id}
                            variant={selectedSkills.includes(skill.id) ? 'default' : 'outline'}
                            className="cursor-pointer transition-colors"
                            onClick={() => toggleSkill(skill.id)}
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Availability Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Availability</label>
                      <Select value={availability} onValueChange={setAvailability}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Any availability" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Any availability</SelectItem>
                          <SelectItem value="full_time">Full-time</SelectItem>
                          <SelectItem value="part_time">Part-time</SelectItem>
                          <SelectItem value="weekends">Weekends</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Max Rate Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Max Hourly Rate: ${maxRate === 200 ? '200+' : maxRate}
                      </label>
                      <Slider
                        value={[maxRate]}
                        onValueChange={([value]) => setMaxRate(value)}
                        min={10}
                        max={200}
                        step={10}
                        className="py-4"
                      />
                    </div>

                    {/* Min Rating Filter */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Min Rating: {minRating > 0 ? `${minRating}+ stars` : 'Any'}
                      </label>
                      <Slider
                        value={[minRating]}
                        onValueChange={([value]) => setMinRating(value)}
                        min={0}
                        max={5}
                        step={1}
                        className="py-4"
                      />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="flex justify-end pt-2">
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="h-4 w-4 mr-2" />
                        Clear all filters
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Loading...' : `${experts.length} expert${experts.length !== 1 ? 's' : ''} found`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : experts.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No experts found</h3>
                <p className="text-muted-foreground text-sm">
                  Try adjusting your filters or search query
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                    Clear all filters
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {experts.map(expert => (
                <Card 
                  key={expert.id} 
                  className="rounded-xl hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewProfile(expert.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={expert.photo_url || undefined} alt={expert.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {expert.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{expert.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          {expert.avg_rating > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              {expert.avg_rating.toFixed(1)}
                              <span className="text-xs">({expert.total_reviews})</span>
                            </span>
                          )}
                          {expert.completed_tasks > 0 && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {expert.completed_tasks} jobs
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {expert.bio && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                        {expert.bio}
                      </p>
                    )}

                    {expert.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {expert.skills.slice(0, 3).map(skill => (
                          <Badge key={skill.id} variant="secondary" className="text-xs">
                            {skill.name}
                          </Badge>
                        ))}
                        {expert.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{expert.skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div className="flex items-center gap-3 text-sm">
                        {expert.hourly_rate && (
                          <span className="flex items-center gap-1 text-foreground font-medium">
                            <DollarSign className="h-3.5 w-3.5" />
                            ${expert.hourly_rate}/hr
                          </span>
                        )}
                        {expert.availability && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {AVAILABILITY_LABELS[expert.availability] || expert.availability}
                          </span>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="rounded-xl"
                        onClick={(e) => handleOpenContactDialog(expert, e)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1.5" />
                        Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Contact Expert Dialog */}
        <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedExpert && (
                  <>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedExpert.photo_url || undefined} alt={selectedExpert.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedExpert.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span>Contact {selectedExpert.name}</span>
                      {selectedExpert.avg_rating > 0 && (
                        <p className="text-sm font-normal text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          {selectedExpert.avg_rating.toFixed(1)} rating
                        </p>
                      )}
                    </div>
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Send a message to introduce yourself and discuss potential projects.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Textarea
                placeholder="Hi! I'm interested in working with you on a project. Could we discuss..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                className="min-h-[120px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters. You can send up to 2 messages per day to each expert.
              </p>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setContactDialogOpen(false)}
                  disabled={sendingMessage}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendContactMessage}
                  disabled={sendingMessage || contactMessage.trim().length < 10}
                >
                  {sendingMessage ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ExpertDiscovery;
