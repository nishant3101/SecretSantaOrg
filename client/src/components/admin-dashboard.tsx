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
import { UserWithWishlist, AppState } from "@shared/schema";
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
  // ⭐ changed: logoutMutation → logout
  const { user, logout } = useAuth();

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

              {/* ⭐ FIXED LOGOUT BUTTON */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* --- rest of file unchanged --- */}
      {/* everything below is as-is from your code */}

      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        ...
      </main>
    </div>
  );
}
