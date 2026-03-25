"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export default function Pricing() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  const handleCheckout = async (slug: string) => {
    if (!session) {
      router.push("/sign-up?callbackUrl=/pricing");
      return;
    }
    await authClient.checkout({ slug });
  };

  return (
    <div className="container mx-auto px-4 py-4">
      {/* Header Section */}
      <section className="py-8 text-center">
        <div className="space-y-6">
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Simple, Transparent
            <br />
            <span className="text-muted-foreground">Pricing</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground">
            Choose the perfect plan for your AI agent needs. Scale as you grow with flexible pricing
            options.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {/* Basic Plan */}
          <div className="flex flex-col rounded-lg border border-border p-6">
            <div className="mb-6">
              <span className="font-medium">Basic</span>
              <p className="mt-1 text-sm text-muted-foreground">For individuals and small teams</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-medium">$20</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
            </div>

            <ul className="mb-6 flex-1 space-y-3">
              <Feature>Access to 3 AI agents</Feature>
              <Feature>1,000 queries per month</Feature>
              <Feature>Standard response times</Feature>
              <Feature>Basic analytics dashboard</Feature>
              <Feature>Email support</Feature>
            </ul>

            <Button className="w-full" onClick={() => handleCheckout("basic")}>
              Get Started
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="relative flex flex-col rounded-lg border border-border p-6">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs text-background">
              Popular
            </div>

            <div className="mb-6">
              <span className="font-medium">Pro</span>
              <p className="mt-1 text-sm text-muted-foreground">For growing businesses</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-medium">$80</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
            </div>

            <ul className="mb-6 flex-1 space-y-3">
              <Feature highlighted>Access to 10 AI agents</Feature>
              <Feature highlighted>10,000 queries per month</Feature>
              <Feature highlighted>Priority response times</Feature>
              <Feature>Advanced analytics & insights</Feature>
              <Feature>Priority email support</Feature>
              <Feature>Full API access</Feature>
              <Feature>Custom integrations</Feature>
            </ul>

            <Button className="w-full" onClick={() => handleCheckout("pro")}>
              Get Started
            </Button>
          </div>

          {/* Max Plan */}
          <div className="flex flex-col rounded-lg border border-border p-6">
            <div className="mb-6">
              <span className="font-medium">Max</span>
              <p className="mt-1 text-sm text-muted-foreground">For high usage</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-medium">$100</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
            </div>

            <ul className="mb-6 flex-1 space-y-3">
              <Feature>Unlimited AI agents</Feature>
              <Feature>Unlimited queries</Feature>
              <Feature>Fastest response times</Feature>
              <Feature>Enterprise analytics suite</Feature>
              <Feature>24/7 dedicated support</Feature>
              <Feature>Advanced API & webhooks</Feature>
              <Feature>Custom AI agent development</Feature>
              <Feature>SLA guarantees</Feature>
              <Feature>Dedicated account manager</Feature>
            </ul>

            <Button className="w-full" onClick={() => handleCheckout("max")}>
              Get Started
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({
  children,
  highlighted = false,
}: {
  children: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <Check
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          highlighted ? "text-foreground" : "text-muted-foreground",
        )}
        strokeWidth={1.5}
      />
      <span
        className={cn(
          "text-sm leading-relaxed",
          highlighted ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
      </span>
    </li>
  );
}
