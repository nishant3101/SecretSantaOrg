import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { setCurrentUser, clearCurrentUser } from "@/lib/userStore";

type AuthContextType = {
  user: SelectUser | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logout: () => void;
};

type LoginData = {
  username: string;
  password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<SelectUser | null>(null);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const body = await res.json();

      if (!body.success || !body.user) {
        throw new Error(body.message || "Invalid username or password");
      }

      return body.user as SelectUser;
    },
    onSuccess: (loggedInUser) => {
      setUser(loggedInUser);
      setCurrentUser(loggedInUser);
    },
    onError: (error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logout = () => {
    setUser(null);
    clearCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, loginMutation, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
