import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { User, UserWithWishlist, AppState } from "@shared/schema";
import {
  Gift,
  UserPlus,
  Shuffle,
  LogOut,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  ClipboardList,
  Sparkles,
  Loader2,
  RotateCcw,
  Copy,
  Check,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(4, "Password must be at least 4 characters"),
});

type CreateUserData = z.infer<typeof createUserSchema>;

export default function AdminDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [copiedUser, setCopiedUser] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);

  const form = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: "", password: "" },
  });

  const { data: participants = [], isLoading: loadingParticipants } = useQuery<UserWithWishlist[]>({
    queryKey: ["/api/participants"],
  });

  const { data: appState } = useQuery<AppState>({
    queryKey: ["/api/app-state"],
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const res = await apiRequest("POST", "/api/participants", {
        username: data.username,
        password: data.password,
        role: "participant",
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/participants"] });
      setCreatedCredentials({ username: variables.username, password: variables.password });
      form.reset();
      toast({
        title: "Participant created",
        description: "Share the credentials with the participant",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create participant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const shuffleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shuffle");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-state"] });
      queryClient.invalidateQueries({ queryKey: ["/api/participants"] });
      toast({
        title: "Secret Santa Shuffle Complete!",
        description: "Everyone has been assigned their gift recipient",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Shuffle failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/app-state"] });
      queryClient.invalidateQueries({ queryKey: ["/api/participants"] });
      toast({
        title: "Reset Complete",
        description: "All assignments have been cleared",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteParticipantMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/participants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/participants"] });
      toast({
        title: "Participant deleted",
        description: "The participant has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete participant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (data: CreateUserData) => {
    createUserMutation.mutate(data);
  };

  const handleCopyCredentials = async (username: string, password: string) => {
    const text = `Username: ${username}\nPassword: ${password}`;
    await navigator.clipboard.writeText(text);
    setCopiedUser(username);
    setTimeout(() => setCopiedUser(null), 2000);
    toast({
      title: "Copied to clipboard",
      description: "Credentials have been copied",
    });
  };

  const completedCount = participants.filter((p) => p.wishlistCompleted).length;
  const pendingCount = participants.length - completedCount;
  const shuffleReady = participants.length >= 3 && completedCount === participants.length;

  const getStatusBadge = (participant: UserWithWishlist) => {
    if (participant.wishlistCompleted) {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Complete
        </Badge>
      );
    }
    if (participant.wishlist) {
      return (
        <Badge variant="default" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
          <Clock className="w-3 h-3 mr-1" />
          In Progress
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" />
        Not Started
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Secret Santa</h1>
                <p className="text-sm text-muted-foreground">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Participants
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-participants">
                {participants.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Wishlists Complete
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-completed-wishlists">
                {completedCount} / {participants.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Shuffle Status
              </CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div data-testid="text-shuffle-status">
                {appState?.shuffleCompleted ? (
                  <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setCreatedCredentials(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-participant">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Participant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Participant</DialogTitle>
                <DialogDescription>
                  Create credentials for a new participant. Share these with them so they can log in.
                </DialogDescription>
              </DialogHeader>
              {createdCredentials ? (
                <div className="space-y-4">
                  <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                      <div className="text-center mb-4">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                        <p className="font-medium text-green-800 dark:text-green-200">Participant Created!</p>
                      </div>
                      <div className="space-y-3 bg-background rounded-lg p-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Username</p>
                          <p className="font-mono font-medium" data-testid="text-created-username">{createdCredentials.username}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Password</p>
                          <p className="font-mono font-medium" data-testid="text-created-password">{createdCredentials.password}</p>
                        </div>
                      </div>
                      <Button
                        className="w-full mt-4"
                        variant="outline"
                        onClick={() => handleCopyCredentials(createdCredentials.username, createdCredentials.password)}
                        data-testid="button-copy-credentials"
                      >
                        {copiedUser === createdCredentials.username ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Credentials
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setCreatedCredentials(null);
                    }}
                    data-testid="button-create-another"
                  >
                    Create Another Participant
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., john_doe" {...field} data-testid="input-create-username" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="text" placeholder="Create a simple password" {...field} data-testid="input-create-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createUserMutation.isPending} data-testid="button-submit-create">
                      {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Participant
                    </Button>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>

          <Button
            variant="default"
            disabled={!shuffleReady || appState?.shuffleCompleted || shuffleMutation.isPending}
            onClick={() => shuffleMutation.mutate()}
            data-testid="button-shuffle"
          >
            {shuffleMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shuffle className="w-4 h-4 mr-2" />
            )}
            Shuffle Secret Santa
          </Button>

          {appState?.shuffleCompleted && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" data-testid="button-reset">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Shuffle
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Secret Santa Shuffle?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all current assignments. Participants will need to wait for a new shuffle before they can see their match.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-reset">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resetMutation.mutate()}
                    className="bg-destructive text-destructive-foreground"
                    data-testid="button-confirm-reset"
                  >
                    {resetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Shuffle Requirements Info */}
        {!appState?.shuffleCompleted && (
          <Card className="mb-8 border-dashed">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Shuffle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Ready to Shuffle?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className={participants.length >= 3 ? "text-green-600 dark:text-green-400" : ""}>
                      {participants.length >= 3 ? <CheckCircle className="w-4 h-4 inline mr-1" /> : <AlertCircle className="w-4 h-4 inline mr-1" />}
                      At least 3 participants ({participants.length}/3)
                    </li>
                    <li className={completedCount === participants.length && participants.length > 0 ? "text-green-600 dark:text-green-400" : ""}>
                      {completedCount === participants.length && participants.length > 0 ? (
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                      ) : (
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                      )}
                      All wishlists completed ({completedCount}/{participants.length})
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participants List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants
            </CardTitle>
            <CardDescription>
              Manage participants and track their wishlist status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingParticipants ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No participants yet</p>
                <p className="text-sm text-muted-foreground">Create participants to get started</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {participants.map((participant) => (
                  <Card key={participant.id} className="bg-muted/30" data-testid={`card-participant-${participant.id}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-semibold text-primary">
                              {participant.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground" data-testid={`text-username-${participant.id}`}>
                              {participant.username}
                            </p>
                            <div className="mt-1">{getStatusBadge(participant)}</div>
                          </div>
                        </div>
                      </div>
                      {participant.wishlist && (
                        <div className="space-y-1 mb-4">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Wishlist</p>
                          <ul className="text-sm space-y-1">
                            {participant.wishlist.item1 && (
                              <li className="flex items-center gap-2 text-foreground">
                                <Gift className="w-3 h-3 text-primary" />
                                {participant.wishlist.item1}
                              </li>
                            )}
                            {participant.wishlist.item2 && (
                              <li className="flex items-center gap-2 text-foreground">
                                <Gift className="w-3 h-3 text-primary" />
                                {participant.wishlist.item2}
                              </li>
                            )}
                            {participant.wishlist.item3 && (
                              <li className="flex items-center gap-2 text-foreground">
                                <Gift className="w-3 h-3 text-primary" />
                                {participant.wishlist.item3}
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive" data-testid={`button-delete-${participant.id}`}>
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {participant.username}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this participant and their wishlist. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteParticipantMutation.mutate(participant.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
