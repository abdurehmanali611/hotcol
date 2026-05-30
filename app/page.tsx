import Login from "@/components/Login";

export default function Home() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-10"
      style={{
        backgroundImage: "url('/assets/signin.jpg')",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <Login />
    </div>
  );
}
