import { SignUp } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { resolvePostAuth } from "@/lib/intents";
import { authPageParams, ownOrigins } from "@/lib/auth-params";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignUpPage({ searchParams }: Props) {
  const params = authPageParams(await searchParams);
  const target = resolvePostAuth(params, await ownOrigins());
  const query = params.intent ? `?intent=${encodeURIComponent(params.intent)}` : "";
  return (
    <AuthLayout heading="Create your Vero account">
      <SignUp forceRedirectUrl={target} signInForceRedirectUrl={target} signInUrl={`/sign-in${query}`} />
    </AuthLayout>
  );
}
