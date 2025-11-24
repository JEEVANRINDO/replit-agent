import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Lock, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { signupSchema, loginSchema, type SignupData, type LoginData } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [, setLocation] = useLocation();
  const { signup, login } = useAuth();
  const { toast } = useToast();

  const signupForm = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSignup = async (data: SignupData) => {
    try {
      await signup(data.email, data.password);
      toast({
        title: "Account created",
        description: "Setting up your encryption keys...",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Signup failed",
        description: error.message || "Failed to create account",
      });
    }
  };

  const onLogin = async (data: LoginData) => {
    try {
      await login(data.email, data.password);
      setLocation("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "Invalid email or password",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md space-y-6">
        {/* Logo and branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground">SecureChat</h1>
          <p className="text-sm text-muted-foreground">
            End-to-end encrypted messaging
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              {isSignup ? "Create an account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignup 
                ? "Sign up to start secure conversations" 
                : "Sign in to your account to continue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSignup ? (
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="you@example.com"
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-confirm-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={signupForm.formState.isSubmitting}
                    data-testid="button-signup"
                  >
                    {signupForm.formState.isSubmitting ? "Creating account..." : "Sign up"}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="you@example.com"
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            placeholder="••••••••"
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginForm.formState.isSubmitting}
                    data-testid="button-login"
                  >
                    {loginForm.formState.isSubmitting ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-4 text-center text-sm">
              <button
                onClick={() => setIsSignup(!isSignup)}
                className="text-primary hover:underline"
                data-testid="button-toggle-auth-mode"
              >
                {isSignup 
                  ? "Already have an account? Sign in" 
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          <Lock className="inline h-3 w-3 mr-1" />
          Your messages are protected with end-to-end encryption using the Signal protocol
        </p>
      </div>
    </div>
  );
}
