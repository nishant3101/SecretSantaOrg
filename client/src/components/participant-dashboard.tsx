import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wishlist, AppState, AssignmentWithDetails } from "@shared/schema";
import {
  Gift,
  LogOut,
  Sparkles,
  Loader2,
  CheckCircle,
  Clock,
  PartyPopper,
} from "lucide-react";
import { useEffect } from "react";

const wishlistSchema = z.object({
  item1: z.string().min(1, "Please add at least one gift idea"),
  item2: z.string().optional(),
  item3: z.string().optional(),
});

type WishlistFormData = z.infer<typeof wishlistSchema>;

export default function ParticipantDashboard() {
  // ⭐ logoutMutation → logout (stateless)
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const { data: wishlist, isLoading: loadingWishlist } = useQuery<Wishlist | null>({
    queryKey: ["/api/my-wishlist"],
  });

  const { data: appState } = useQuery<AppState>({
    queryKey: ["/api/app-state"],
  });

  const { data: assignment } = useQuery<AssignmentWithDetails | null>({
    queryKey: ["/api/my-assignment"],
    enabled: appState?.shuffleCompleted === true,
  });

  const form = useForm<WishlistFormData>({
    resolver: zodResolver(wishlistSchema),
    defaultValues: {
      item1: "",
      item2: "",
      item3: "",
    },
  });

  useEffect(() => {
    if (wishlist) {
      form.reset({
        item1: wishlist.item1 || "",
        item2: wishlist.item2 || "",
        item3: wishlist.item3 || "",
      });
    }
  }, [wishlist, form]);

  const saveWishlistMutation = useMutation({
    mutationFn: async (data: WishlistFormData) => {
      const res = await apiRequest("POST", "/api/my-wishlist", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Wishlist saved!",
        description: "Your gift ideas have been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save wishlist",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveWishlist = (data: WishlistFormData) => {
    saveWishlistMutation.mutate(data);
  };

  if (!user) return null;

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
                <p className="text-sm text-muted-foreground">Welcome, {user.username}!</p>
              </div>
            </div>

            {/* ⭐ FIXED LOGOUT BUTTON */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
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

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        {/* Wishlist Status */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div>
              <CardTitle className="text-lg">Your Wishlist Status</CardTitle>
              <CardDescription>
                {user.wishlistCompleted 
                  ? "Your wishlist is complete!" 
                  : "Add your gift ideas so your Secret Santa knows what you'd like"}
              </CardDescription>
            </div>

            {user.wishlistCompleted ? (
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Wishlist Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Your Wishlist
            </CardTitle>
            <CardDescription>
              Add up to 3 gift ideas. Your Secret Santa will see these to help pick the perfect gift!
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingWishlist ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveWishlist)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="item1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                            1
                          </span>
                          First Gift Idea
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Cozy sweater in blue" 
                            {...field}
                            data-testid="input-wishlist-item1"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="item2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/80 text-primary-foreground text-xs font-bold flex items-center justify-center">
                            2
                          </span>
                          Second Gift Idea (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., A good fantasy book" 
                            {...field}
                            data-testid="input-wishlist-item2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="item3"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/60 text-primary-foreground text-xs font-bold flex items-center justify-center">
                            3
                          </span>
                          Third Gift Idea (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Wireless earbuds" 
                            {...field}
                            data-testid="input-wishlist-item3"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={saveWishlistMutation.isPending}
                    data-testid="button-save-wishlist"
                  >
                    {saveWishlistMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {user.wishlistCompleted ? "Update Wishlist" : "Save Wishlist"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Assignment Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Your Secret Santa Assignment
            </CardTitle>
            <CardDescription>
              {appState?.shuffleCompleted 
                ? "Here's who you'll be giving a gift to!"
                : "Once everyone has completed their wishlists, the admin will shuffle assignments"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!appState?.shuffleCompleted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Waiting for shuffle...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back later once the admin has assigned Secret Santas
                </p>
              </div>
            ) : assignment ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <PartyPopper className="w-10 h-10 text-primary" />
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-2" data-testid="text-assignment-name">
                  {assignment.receiver.username}
                </h3>
                <p className="text-muted-foreground mb-6">You are buying a gift for this person!</p>

                {assignment.receiver.wishlist && (
                  <Card className="bg-muted/30 text-left">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Their Wishlist
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {assignment.receiver.wishlist.item1 && (
                          <li className="flex items-center gap-3" data-testid="text-receiver-wishlist-1">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Gift className="w-4 h-4 text-primary" />
                            </div>
                            {assignment.receiver.wishlist.item1}
                          </li>
                        )}
                        {assignment.receiver.wishlist.item2 && (
                          <li className="flex items-center gap-3" data-testid="text-receiver-wishlist-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Gift className="w-4 h-4 text-primary" />
                            </div>
                            {assignment.receiver.wishlist.item2}
                          </li>
                        )}
                        {assignment.receiver.wishlist.item3 && (
                          <li className="flex items-center gap-3" data-testid="text-receiver-wishlist-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Gift className="w-4 h-4 text-primary" />
                            </div>
                            {assignment.receiver.wishlist.item3}
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
