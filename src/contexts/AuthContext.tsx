
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
  last_seen?: string;
}

interface AuthContextType {
  user: Profile | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (session?.user) {
        // Defer the profile fetch to avoid blocking the auth state change
        setTimeout(async () => {
          await fetchUserProfile(session.user);
          // Update user status to online when they login
          try {
            await supabase.rpc('update_user_status', { user_status: 'online' });
          } catch (error) {
            console.error('Error updating user status:', error);
          }
        }, 0);
      } else {
        setUser(null);
      }
      
      // Always reset loading state when auth state changes
      setIsLoading(false);
    });

    // THEN check for existing session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchUserProfile(session.user);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      }
    };

    getInitialSession();

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (authUser: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          avatar_url: data.avatar_url,
          status: (data.status as 'online' | 'offline' | 'away') || 'offline',
          last_seen: data.last_seen,
        });
      }
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        setError(error.message);
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.id);
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in.",
        });
        // Don't set loading to false here - let the auth state change handle it
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (err) {
      console.error('Login exception:', err);
      setError('Login failed. Please try again.');
      toast({
        title: "Error",
        description: "Login failed. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username,
          },
        },
      });

      if (error) {
        console.error('Registration error:', error);
        setError(error.message);
        toast({
          title: "Registration Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      if (data.user) {
        toast({
          title: "Registration Successful!",
          description: "Please check your email to verify your account.",
        });
        setIsLoading(false);
        return true;
      }

      setIsLoading(false);
      return false;
    } catch (err) {
      console.error('Registration exception:', err);
      setError('Registration failed. Please try again.');
      toast({
        title: "Error",
        description: "Registration failed. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Update status to offline before logout
      if (user) {
        await supabase.rpc('update_user_status', { user_status: 'offline' });
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
      }
      setUser(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      isLoading,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
};
