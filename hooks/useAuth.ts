"use client";

import { authClient } from "@/lib/auth-client";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
}

export function useAuth() {
  const session = authClient.useSession();
  const user: AuthUser | null = session.data?.user
    ? {
        id: session.data.user.id,
        email: session.data.user.email,
        name: session.data.user.name,
        image: session.data.user.image,
        emailVerified: session.data.user.emailVerified,
      }
    : null;

  const signIn = async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) throw new Error(result.error.message);
    return result;
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const result = await authClient.signUp.email({
      email,
      password,
      name: name || "",
    });
    if (result.error) throw new Error(result.error.message);
    return result;
  };

  const signInWithGoogle = async () => {
    return authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  const signInWithApple = async () => {
    return authClient.signIn.social({
      provider: "apple",
      callbackURL: "/",
    });
  };

  const signInWithGithub = async () => {
    return authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
  };

  const signOut = async () => {
    await authClient.signOut();
  };

  return {
    user,
    loading: session.isPending,
    isAuthenticated: !!session.data?.user,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signInWithGithub,
    signOut,
  };
}

export default useAuth;
