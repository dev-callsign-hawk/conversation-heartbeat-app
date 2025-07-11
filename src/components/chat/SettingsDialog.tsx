
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Key, 
  Link, 
  Copy, 
  UserPlus, 
  Trash2,
  Camera
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth();
  const { generateInviteCode, sendFriendRequestByInvite } = useChat();
  const [inviteCode, setInviteCode] = useState('');
  const [friendInviteCode, setFriendInviteCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState(user?.username || '');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleGenerateInvite = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const code = await generateInviteCode();
      if (code) {
        setInviteCode(code);
        toast({
          title: "Invite code generated!",
          description: "Share this code with friends to connect.",
        });
      }
    } catch (error) {
      console.error('Error generating invite:', error);
      toast({
        title: "Error",
        description: "Failed to generate invite code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard.",
      });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast({
        title: "Error",
        description: "Failed to copy invite code.",
        variant: "destructive",
      });
    }
  };

  const handleSendFriendRequest = async () => {
    if (!friendInviteCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter an invite code.",
        variant: "destructive",
      });
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    try {
      await sendFriendRequestByInvite(friendInviteCode.trim());
      setFriendInviteCode('');
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in both password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (passwordLoading) return;

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Password updated successfully.",
        });
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Username cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user?.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Profile updated successfully.",
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your profile, security, and friend connections.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>
                  Update your profile information and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Avatar className="w-20 h-20">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-2xl">
                        {user?.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                      title="Change Avatar"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={user?.email}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleUpdateProfile} 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="friends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Add Friends
                </CardTitle>
                <CardDescription>
                  Connect with friends using invite codes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Invite Code</Label>
                  <div className="flex space-x-2">
                    <Input
                      value={inviteCode}
                      readOnly
                      placeholder="Generate an invite code to share"
                      className="font-mono"
                    />
                    <Button 
                      onClick={handleGenerateInvite} 
                      disabled={isLoading}
                    >
                      <Link className="w-4 h-4 mr-2" />
                      {isLoading ? 'Generating...' : 'Generate'}
                    </Button>
                    {inviteCode && (
                      <Button variant="outline" onClick={handleCopyInvite}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this code with friends so they can send you friend requests.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Add Friend by Code</Label>
                  <div className="flex space-x-2">
                    <Input
                      value={friendInviteCode}
                      onChange={(e) => setFriendInviteCode(e.target.value)}
                      placeholder="Enter friend's invite code"
                      className="font-mono"
                    />
                    <Button 
                      onClick={handleSendFriendRequest} 
                      disabled={isLoading}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {isLoading ? 'Adding...' : 'Add Friend'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter a friend's invite code to send them a friend request.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Change Password
                </CardTitle>
                <CardDescription>
                  Update your account password for better security.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleUpdatePassword} 
                    disabled={passwordLoading}
                  >
                    {passwordLoading ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible actions that affect your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" className="w-full">
                  Delete Account
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  This will permanently delete your account and all associated data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
