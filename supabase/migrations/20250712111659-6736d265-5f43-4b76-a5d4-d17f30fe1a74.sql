
-- Fix the infinite recursion in conversation_participants RLS policy
-- Drop the problematic policy first
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

-- Create a new policy that doesn't reference the same table
CREATE POLICY "Users can view conversation participants" ON public.conversation_participants 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_participants.conversation_id 
    AND c.created_by = auth.uid()
  )
);

-- Also ensure the conversations table has an UPDATE policy for better functionality
CREATE POLICY "Users can update their conversations" ON public.conversations 
FOR UPDATE 
USING (
  created_by = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp 
    WHERE cp.conversation_id = conversations.id 
    AND cp.user_id = auth.uid()
  )
);
