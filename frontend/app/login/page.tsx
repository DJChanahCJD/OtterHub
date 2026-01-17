"use client";

import { useState } from "react";
import { login } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Key, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Footer } from "@/components/footer";
import { APP_CATEGORY, APP_NAME } from "@/lib/ui-text";

const loginSchema = z.object({
  password: z.string().min(1, "请输入密码"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await login(values.password);
      toast.success("登录成功");
      router.push("/");
    } catch (err: any) {
      console.error("Login failed:", err);
      toast.error(err.message || "登录失败，请检查密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between p-6 bg-linear-to-br from-gradient-from via-gradient-via to-gradient-to overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] animate-pulse delay-700" />

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[320px] z-10 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-primary to-accent flex items-center justify-center text-5xl shadow-2xl shadow-primary/30 mb-6 animate-bounce">
            🦦
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter">{APP_NAME}</h1>
          <p className="text-foreground/50 text-sm font-medium mt-2 tracking-widest uppercase">{APP_CATEGORY}</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30 group-focus-within:text-primary transition-colors" />
                      <Input
                        type="password"
                        placeholder="请输入访问密码"
                        className="h-12 pl-11 bg-glass-bg border-glass-border backdrop-blur-md text-foreground placeholder:text-foreground/30 focus-visible:ring-primary/50 transition-all rounded-2xl"
                        disabled={loading}
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-center mt-2 text-xs" />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-12 rounded-2xl bg-foreground text-background hover:opacity-90 transition-all font-bold text-base shadow-xl"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "登录"
              )}
            </Button>
          </form>
        </Form>
      </div>

      <div className="relative z-10 opacity-60 hover:opacity-100 transition-opacity">
        <Footer />
      </div>
    </div>
  );
}
