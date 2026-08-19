import Login from "@/components/Login";
import { AuthPageShell } from "@/components/AuthPageShell";

export default function Home() {
  return (
    <AuthPageShell compact>
      <Login />
    </AuthPageShell>
  );
}
