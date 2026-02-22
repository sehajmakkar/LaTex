import { SignUp } from "@clerk/nextjs";
import { AuthThemeBar } from "@/components/shared/AuthThemeBar";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AuthThemeBar />
      <div className="flex flex-1 items-center justify-center p-4">
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            },
          }}
          forceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
