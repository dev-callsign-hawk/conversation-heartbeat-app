
-- Create friend requests table
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Create friendships table (for accepted friend requests)
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Ensure consistent ordering to avoid duplicates
);

-- Enable RLS for new tables
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_requests
CREATE POLICY "Users can view their own friend requests" ON public.friend_requests FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests" ON public.friend_requests FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND sender_id != receiver_id);

CREATE POLICY "Users can update received friend requests" ON public.friend_requests FOR UPDATE 
USING (auth.uid() = receiver_id);

-- RLS Policies for friendships
CREATE POLICY "Users can view their friendships" ON public.friendships FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create friendships" ON public.friendships FOR INSERT 
WITH CHECK (true); -- Will be handled by function

-- Enable realtime for new tables
ALTER TABLE public.friend_requests REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;

-- Add new tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;

-- Create function to accept friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS VOID AS $$
DECLARE
  req_record RECORD;
BEGIN
  -- Get the friend request
  SELECT sender_id, receiver_id INTO req_record
  FROM public.friend_requests 
  WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or not authorized';
  END IF;
  
  -- Update friend request status
  UPDATE public.friend_requests 
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;
  
  -- Create friendship (ensure consistent ordering)
  INSERT INTO public.friendships (user1_id, user2_id)
  VALUES (
    LEAST(req_record.sender_id, req_record.receiver_id),
    GREATEST(req_record.sender_id, req_record.receiver_id)
  )
  ON CONFLICT (user1_id, user2_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's friends
CREATE OR REPLACE FUNCTION public.get_user_friends()
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  avatar_url TEXT,
  status TEXT,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.username, p.email, p.avatar_url, p.status, p.last_seen
  FROM public.profiles p
  INNER JOIN public.friendships f ON (
    (f.user1_id = auth.uid() AND f.user2_id = p.id) OR
    (f.user2_id = auth.uid() AND f.user1_id = p.id)
  )
  WHERE p.id != auth.uid()
  ORDER BY p.username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate friend invite link
CREATE OR REPLACE FUNCTION public.generate_friend_invite()
RETURNS TEXT AS $$
DECLARE
  invite_code TEXT;
BEGIN
  -- Generate a unique invite code
  invite_code := encode(gen_random_bytes(16), 'hex');
  
  -- Store the invite code in the user's profile (we'll use a new column)
  UPDATE public.profiles 
  SET updated_at = now()
  WHERE id = auth.uid();
  
  RETURN invite_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add invite_code column to profiles
ALTER TABLE public.profiles ADD COLUMN invite_code TEXT UNIQUE;

-- Update the generate_friend_invite function to store invite code
CREATE OR REPLACE FUNCTION public.generate_friend_invite()
RETURNS TEXT AS $$
DECLARE
  invite_code TEXT;
BEGIN
  -- Generate a unique invite code
  invite_code := encode(gen_random_bytes(16), 'hex');
  
  -- Store the invite code in the user's profile
  UPDATE public.profiles 
  SET invite_code = invite_code, updated_at = now()
  WHERE id = auth.uid();
  
  RETURN invite_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send friend request via invite code
CREATE OR REPLACE FUNCTION public.send_friend_request_by_invite(invite_code TEXT)
RETURNS UUID AS $$
DECLARE
  target_user_id UUID;
  request_id UUID;
BEGIN
  -- Find user by invite code
  SELECT id INTO target_user_id
  FROM public.profiles 
  WHERE profiles.invite_code = send_friend_request_by_invite.invite_code
  AND id != auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  
  -- Check if friendship already exists
  IF EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE (user1_id = auth.uid() AND user2_id = target_user_id)
    OR (user1_id = target_user_id AND user2_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Already friends with this user';
  END IF;
  
  -- Check if request already exists
  IF EXISTS (
    SELECT 1 FROM public.friend_requests 
    WHERE (sender_id = auth.uid() AND receiver_id = target_user_id)
    OR (sender_id = target_user_id AND receiver_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Friend request already exists';
  END IF;
  
  -- Create friend request
  INSERT INTO public.friend_requests (sender_id, receiver_id)
  VALUES (auth.uid(), target_user_id)
  RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
