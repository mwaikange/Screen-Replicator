import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, MessageCircle, Calendar, Ticket, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface Plan {
  name: string;
  subtitle: string;
  price: string;
  duration: string;
  features: string[];
  popular?: boolean;
}

const individualPlans: Plan[] = [
  {
    name: "Individual 1 Month",
    subtitle: "Perfect for personal safety",
    price: "N$70",
    duration: "30d",
    features: [
      "Incident reporting",
      "Community groups",
      "File management",
      "24/7 support",
    ],
  },
  {
    name: "Individual 3 Months",
    subtitle: "Save with quarterly plan",
    price: "N$180",
    duration: "90d",
    features: [
      "Incident reporting",
      "Community groups",
      "File management",
      "24/7 support",
      "Priority response",
    ],
  },
  {
    name: "Individual 6 Months",
    subtitle: "Save with semi-annual plan",
    price: "N$360",
    duration: "180d",
    features: [
      "Incident reporting",
      "Community groups",
      "File management",
      "24/7 support",
      "Priority response",
      "Free counseling session",
    ],
  },
  {
    name: "Individual 12 Months",
    subtitle: "Best value - annual plan",
    price: "N$660",
    duration: "365d",
    features: [
      "Incident reporting",
      "Community groups",
      "File management",
      "24/7 support",
      "Priority response",
      "Free counseling sessions",
    ],
  },
];

const familyPlans: Plan[] = [
  {
    name: "Family 1 Month",
    subtitle: "Covers 4 Family Members",
    price: "N$150",
    duration: "30d",
    features: [
      "All individual features",
      "File management",
      "4 family members covered",
      "Priority response",
    ],
    popular: true,
  },
  {
    name: "Family 3 Months",
    subtitle: "Covers 4 Family Members",
    price: "N$360",
    duration: "90d",
    features: [
      "All individual features",
      "File management",
      "4 family members covered",
      "Priority response",
      "Free counseling",
    ],
    popular: true,
  },
  {
    name: "Family 6 Months",
    subtitle: "Covers 4 Family Members",
    price: "N$720",
    duration: "180d",
    features: [
      "All individual features",
      "File management",
      "4 family members covered",
      "Priority response",
      "Free counseling",
    ],
    popular: true,
  },
  {
    name: "Family 12 Months",
    subtitle: "Covers 6 Family Members",
    price: "N$1440",
    duration: "365d",
    features: [
      "All individual features",
      "File management",
      "6 family members covered",
      "Priority response",
      "Free counseling sessions",
    ],
    popular: true,
  },
];

const touristPlans: Plan[] = [
  {
    name: "Tourist 5 Days",
    subtitle: "Short stay coverage",
    price: "N$399",
    duration: "5d",
    features: [
      "Incident reporting",
      "Community groups",
      "File management",
      "24/7 support",
    ],
  },
  {
    name: "Tourist 10 Days",
    subtitle: "Extended stay coverage",
    price: "N$700",
    duration: "10d",
    features: [
      "Incident reporting",
      "Community groups",
      "File management",
      "24/7 support",
      "Priority response",
    ],
  },
  {
    name: "Tourist 14 Days",
    subtitle: "Two week coverage",
    price: "N$900",
    duration: "14d",
    features: [
      "Incident reporting",
      "Community groups",
      "File management",
      "24/7 support",
      "Priority response",
    ],
  },
  {
    name: "Tourist 30 Days",
    subtitle: "Full month coverage",
    price: "N$1800",
    duration: "30d",
    features: [
      "Incident reporting",
      "Community groups",
      "File management",
      "24/7 support",
      "Priority response",
      "Free counseling",
    ],
  },
];

function getWhatsAppUrl(planName: string, price: string) {
  const message = `Hi Ngumu's Eye Support, I would like to subscribe to the ${planName} of ${price}. Please advise how I can make payment?`;
  return `https://api.whatsapp.com/send/?phone=264816802064&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
}

function getGeneralWhatsAppUrl() {
  const message = "Hi Ngumu's Eye Support, I would like to subscribe. Please advise how I can make payment?";
  return `https://api.whatsapp.com/send/?phone=264816802064&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
}

function PlanCard({ plan }: { plan: Plan }) {
  const slug = plan.name.toLowerCase().replace(/ /g, "-");

  return (
    <Card
      className={plan.popular ? "border-primary border-2 relative" : ""}
      data-testid={`card-plan-${slug}`}
    >
      {plan.popular && (
        <div className="flex justify-center -mt-3">
          <Badge className="bg-primary text-primary-foreground text-xs">
            Most Popular
          </Badge>
        </div>
      )}
      <CardContent className={`p-4 ${plan.popular ? "pt-2" : ""}`}>
        <h3 className="font-bold text-base" data-testid={`text-plan-name-${slug}`}>{plan.name}</h3>
        <p className="text-xs text-muted-foreground mb-2">{plan.subtitle}</p>

        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-2xl font-bold text-primary">{plan.price}</span>
          <span className="text-sm text-muted-foreground">/ {plan.duration}</span>
        </div>

        <ul className="space-y-1.5 mb-4">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          className="w-full"
          onClick={() => window.open(getWhatsAppUrl(plan.name, plan.price), "_blank")}
          data-testid={`button-pay-${slug}`}
        >
          Pay Now
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SubscribePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [voucherCode, setVoucherCode] = useState("");
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const redeemVoucher = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch("/api/voucher/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to redeem voucher");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: `Voucher redeemed! ${data.planName} activated.` });
      setVoucherCode("");
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const hasActiveSubscription = user?.subscriptionStatus === "active" && user?.subscriptionExpiry;

  const daysRemaining = hasActiveSubscription && user?.subscriptionExpiry
    ? Math.max(0, Math.ceil((new Date(user.subscriptionExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const formattedExpiry = hasActiveSubscription && user?.subscriptionExpiry
    ? new Date(user.subscriptionExpiry).toLocaleDateString()
    : "";

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Membership Packages" />

      <div className="px-4 py-4 space-y-6">
        {hasActiveSubscription && (
          <Card className="border-primary/30 bg-blue-50 dark:bg-blue-950/20" data-testid="card-active-subscription">
            <CardContent className="p-4">
              <h3 className="text-lg font-bold text-primary mb-1" data-testid="text-active-subscription">Active Subscription</h3>
              <p className="text-sm text-muted-foreground mb-2">
                You currently have an active {user?.subscriptionPlanName || user?.subscriptionType} subscription
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                <span>Expires: {formattedExpiry}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{daysRemaining} days remaining</p>
              <div className="flex justify-end">
                <Button
                  onClick={() => setLocation("/case-deck")}
                  data-testid="button-case-deck"
                >
                  Go to My Case Deck
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-voucher-redeem">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base">Redeem Voucher</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Have a voucher code? Enter it below to activate your subscription.</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter voucher code"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                data-testid="input-voucher-code"
              />
              <Button
                onClick={() => redeemVoucher.mutate(voucherCode)}
                disabled={!voucherCode.trim() || redeemVoucher.isPending}
                data-testid="button-redeem-voucher"
              >
                {redeemVoucher.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-xl font-bold mb-1">Individual Plans</h2>
          <p className="text-sm text-muted-foreground mb-3">Perfect for personal safety and security</p>
          <div className="space-y-3">
            {individualPlans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-1">Family Plans</h2>
          <p className="text-sm text-muted-foreground mb-3">Protect your whole family together</p>
          <div className="space-y-3">
            {familyPlans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-1">Tourist Plans</h2>
          <p className="text-sm text-muted-foreground mb-3">Short-term coverage for visitors</p>
          <div className="space-y-3">
            {touristPlans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>

        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" data-testid="card-whatsapp-contact">
          <CardContent className="p-5 text-center">
            <MessageCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-1">Ready to subscribe?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Contact us on WhatsApp to complete your payment and activate your subscription
            </p>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => window.open(getGeneralWhatsAppUrl(), "_blank")}
              data-testid="button-contact-whatsapp"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contact on WhatsApp
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
}
