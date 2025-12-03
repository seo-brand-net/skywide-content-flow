-- Create features table for user feature requests
CREATE TABLE public.features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')),
  category TEXT NOT NULL CHECK (category IN ('Bug Report', 'Feature Request', 'Improvement')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own features or admins view all" 
ON public.features 
FOR SELECT 
USING (auth.uid() = user_id OR is_admin_user());

CREATE POLICY "Users can create their own features" 
ON public.features 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own features" 
ON public.features 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update feature status" 
ON public.features 
FOR UPDATE 
USING (is_admin_user());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_features_updated_at
BEFORE UPDATE ON public.features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();