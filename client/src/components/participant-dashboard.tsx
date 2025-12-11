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
  const { user, logout } = useAuth();
  const { toast } = useToast();

  if (!user) return null;

  // ⭐ stateless backend: include userId in query
  const { data: wishlist, isLoading: loadingWishlist } = useQuery<Wishlist | null>({
    queryKey: ["/api/my-wishlist", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/my-wishlist?userId=${user.id}`);
      return res.json();
    },
  });

  const { data: appState } = useQuery<AppState>({
    queryKey: ["/api/app-state"],
  });

  const { data: assignment } = useQuery<AssignmentWithDetails | null>({
    queryKey: ["/api/my-assignment", user.id],
    enabled: appState?.shuffleCompleted === true,
    queryFn: async () => {
      const res = await fetch(`/api/my-assignment?giverId=${user.id}`);
      return res.json();
    },
  });

  const form = useForm<WishlistFormData>({
    resolver: zodResolver(wishlistSchema),
    defaultValues: { item1: "", item2: "", item3: "" },
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
      const res = await apiRequest("POST", "/api/my-wishlist", {
        userId: user.id,      // ⭐ REQUIRED
        ...data,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Wishlist saved!",
        description: "Your gift ideas have been saved successfully",
      });
    },
  });

  const handleSaveWishlist = (data: WishlistFormData) => {
    saveWishlistMutation.mutate(data);
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
                <p className="text-sm text-muted-foreground">Welcome, {user.username}!</p>
              </div>
            </div>

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
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Wishlist form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Your Wishlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingWishlist ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveWishlist)} className="space-y-4">
                  {["item1", "item2", "item3"].map((field, index) => (
                    <FormField
                      key={field}
                      control={form.control}
                      name={field as keyof WishlistFormData}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gift Idea {index + 1}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}

                  <Button className="w-full" disabled={saveWishlistMutation.isPending}>
                    {saveWishlistMutation.isPending && (
                      <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    )}
                    Save Wishlist
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Your Secret Santa Assignment
            </CardTitle>
          </CardHeader>

          <CardContent>
            {!appState?.shuffleCompleted ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Waiting for shuffle…</p>
              </div>
            ) : assignment ? (
              <div className="text-center">
                <PartyPopper className="w-10 h-10 mx-auto mb-2 text-primary" />
                <h3 className="font-bold text-2xl">{assignment.receiver.username}</h3>
              </div>
            ) : (
              <Loader2 className="animate-spin w-6 h-6 mx-auto" />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
