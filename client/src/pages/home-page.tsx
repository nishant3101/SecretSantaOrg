import { useAuth } from "@/hooks/use-auth";
import AdminDashboard from "@/components/admin-dashboard";
import ParticipantDashboard from "@/components/participant-dashboard";

export default function HomePage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "admin") {
    return <AdminDashboard />;
  }

  return <ParticipantDashboard />;
}
