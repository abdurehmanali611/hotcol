import Login from "@/components/Login";

export default function Home() {
  return (
    <div className="flex flex-col gap-10 items-center h-screen justify-center" style={{backgroundImage: "url('/assets/signin.jpg')", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundSize: "cover"}}>
      <Login />
    </div>
  );
}
