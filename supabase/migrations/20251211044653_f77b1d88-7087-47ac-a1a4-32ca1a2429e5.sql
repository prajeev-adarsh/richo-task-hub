-- Create skills reference table
CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category task_category NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view skills
CREATE POLICY "Anyone can view skills"
  ON public.skills FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert all skills (70+ skills across 4 categories)
INSERT INTO public.skills (name, category) VALUES
  -- Creative & Custom (18 skills)
  ('Video Editing', 'custom'),
  ('Graphic Design', 'custom'),
  ('Animation (2D/3D)', 'custom'),
  ('Motion Graphics', 'custom'),
  ('Audio Engineering', 'custom'),
  ('Music Production', 'custom'),
  ('Voice Over', 'custom'),
  ('Photography', 'custom'),
  ('Videography', 'custom'),
  ('Illustration', 'custom'),
  ('Logo Design', 'custom'),
  ('Thumbnail Design', 'custom'),
  ('Podcast Editing', 'custom'),
  ('VFX/Visual Effects', 'custom'),
  ('3D Modeling', 'custom'),
  ('UI/UX Design', 'custom'),
  ('Interior Design', 'custom'),
  ('Fashion Design', 'custom'),
  -- AI & Tech (21 skills)
  ('Web Development', 'ai'),
  ('Mobile App Development', 'ai'),
  ('AI/ML Development', 'ai'),
  ('Data Science', 'ai'),
  ('Cybersecurity', 'ai'),
  ('Cloud Computing', 'ai'),
  ('DevOps', 'ai'),
  ('Database Administration', 'ai'),
  ('API Development', 'ai'),
  ('Blockchain Development', 'ai'),
  ('Game Development', 'ai'),
  ('Software Testing/QA', 'ai'),
  ('AI Automation', 'ai'),
  ('Chatbot Development', 'ai'),
  ('Data Entry', 'ai'),
  ('Virtual Assistance', 'ai'),
  ('Tech Support', 'ai'),
  ('SEO', 'ai'),
  ('Digital Marketing', 'ai'),
  ('Social Media Management', 'ai'),
  ('No-Code Development', 'ai'),
  -- Student Tasks (15 skills)
  ('Tutoring - Math', 'student'),
  ('Tutoring - Science', 'student'),
  ('Tutoring - English', 'student'),
  ('Tutoring - Programming', 'student'),
  ('Assignment Help', 'student'),
  ('Research Assistance', 'student'),
  ('Academic Writing', 'student'),
  ('Thesis/Dissertation Help', 'student'),
  ('Presentation Design', 'student'),
  ('Proofreading & Editing', 'student'),
  ('Translation', 'student'),
  ('Transcription', 'student'),
  ('Resume Writing', 'student'),
  ('Cover Letter Writing', 'student'),
  ('Exam Preparation', 'student'),
  -- Skilled Work (20 skills)
  ('Plumbing', 'skilled'),
  ('Electrical Work', 'skilled'),
  ('Carpentry', 'skilled'),
  ('Painting', 'skilled'),
  ('HVAC Repair', 'skilled'),
  ('Appliance Repair', 'skilled'),
  ('Furniture Assembly', 'skilled'),
  ('Moving & Packing', 'skilled'),
  ('Delivery Services', 'skilled'),
  ('Cleaning Services', 'skilled'),
  ('Gardening & Landscaping', 'skilled'),
  ('Home Renovation', 'skilled'),
  ('Welding', 'skilled'),
  ('Auto Repair', 'skilled'),
  ('Handyman Services', 'skilled'),
  ('Event Planning', 'skilled'),
  ('Catering', 'skilled'),
  ('DJ Services', 'skilled'),
  ('Personal Training', 'skilled'),
  ('Cooking & Chef Services', 'skilled');

-- Add skill_id column to doer_skills
ALTER TABLE public.doer_skills 
ADD COLUMN skill_id uuid REFERENCES public.skills(id);

-- Create index for faster lookups
CREATE INDEX idx_skills_category ON public.skills(category);
CREATE INDEX idx_doer_skills_skill_id ON public.doer_skills(skill_id);