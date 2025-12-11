import {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";

import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { setCurrentUser, clearCurrentUser } from "../lib/userStore";

type AuthContextType = {
  user: SelectUser | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logout: () => void;
};

type LoginData = {
  username: string;
  password: string;
};

// Context container
export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Stateless: only store user in React memory
  const [user, setUser] = useState<SelectUser | null>(null);

  /**
   * LOGIN MUTATION
   * Calls POST /api/login and sets user in React + global store
   */
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const body = await res.json();

      if (!body.success || !body.user) {
        throw new Error(body.message || "Invalid username or password");
      }

      return body.user as SelectUser;
    },
    onSuccess: (loggedInUser: SelectUser) => {
      setUser(loggedInUser);
      setCurrentUser(loggedInUser); // allow global x-user-id injection
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  /**
   * LOGOUT — simply clears memory (stateless)
   */
  const logout = () => {
    setUser(null);
    clearCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loginMutation,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
