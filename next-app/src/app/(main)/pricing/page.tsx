'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

export default function Pricing() {
  const handleBasicPlan = async () => {
    await authClient.checkout({
      slug: 'basic',
    });
  };

  const handleProPlan = async () => {
    await authClient.checkout({
      slug: 'pro',
    });
  };

  const handleTokenPurchase = async () => {
    await authClient.checkout({
      slug: 'tokens',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <section className="py-16 text-center">
        <div className="space-y-6">
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">
            Simple, Transparent
            <br />
            <span className="text-muted-foreground">Pricing</span>
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-base leading-relaxed">
            Choose the perfect plan for your AI agent needs. Scale as you grow with flexible pricing
            options.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {/* Basic Plan */}
          <div className="border-border flex flex-col rounded-lg border p-6">
            <div className="mb-6">
              <span className="font-medium">Basic</span>
              <p className="text-muted-foreground mt-1 text-sm">For individuals and small teams</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-medium">$20</span>
                <span className="text-muted-foreground text-sm">/ month</span>
              </div>
            </div>

            <ul className="mb-6 flex-1 space-y-3">
              <Feature>Access to 3 AI agents</Feature>
              <Feature>1,000 queries per month</Feature>
              <Feature>Standard response times</Feature>
              <Feature>Basic analytics dashboard</Feature>
              <Feature>Email support</Feature>
            </ul>

            <Button className="w-full" onClick={handleBasicPlan}>
              Get Started
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="border-border relative flex flex-col rounded-lg border p-6">
            <div className="bg-foreground text-background absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs">
              Popular
            </div>

            <div className="mb-6">
              <span className="font-medium">Pro</span>
              <p className="text-muted-foreground mt-1 text-sm">For growing businesses</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-medium">$80</span>
                <span className="text-muted-foreground text-sm">/ month</span>
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

            <Button className="w-full" onClick={handleProPlan}>
              Get Started
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div className="border-border flex flex-col rounded-lg border p-6">
            <div className="mb-6">
              <span className="font-medium">Enterprise</span>
              <p className="text-muted-foreground mt-1 text-sm">For large organizations</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-medium">Custom</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">Tailored to your needs</p>
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

            <Link href="/contact" className="w-full">
              <Button className="w-full" variant="outline">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Token Purchase Section */}
      <section className="pb-16">
        <div className="border-border mx-auto max-w-5xl rounded-lg border p-6">
          <div className="grid gap-6 md:grid-cols-3 md:items-center">
            <div className="text-center md:text-left">
              <span className="font-medium">Token Pack</span>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Boost your AI agent capabilities
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-2xl font-medium">$5</span>
                <span className="text-muted-foreground text-sm">/ 10 tokens</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">One-time purchase</p>
            </div>

            <div className="text-center md:text-right">
              <Button onClick={handleTokenPurchase}>Purchase Tokens</Button>
            </div>
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
          'mt-0.5 h-4 w-4 shrink-0',
          highlighted ? 'text-foreground' : 'text-muted-foreground'
        )}
        strokeWidth={1.5}
      />
      <span
        className={cn(
          'text-sm leading-relaxed',
          highlighted ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {children}
      </span>
    </li>
  );
}
