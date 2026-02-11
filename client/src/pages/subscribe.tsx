import { PageHeader } from "@/components/page-header";
import { BottomNav } from "@/components/bottom-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, MessageCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const plans = [
  {
    name: "Individual 1 Month",
    price: "N$600",
    duration: "30 Days",
    features: [
      "1 user account",
      "Real-time incident alerts",
      "Community feed access",
      "Incident reporting",
      "Map tracking",
    ],
    popular: false,
  },
  {
    name: "Individual 3 Months",
    price: "N$1,500",
    duration: "90 Days",
    savings: "Save N$300",
    features: [
      "1 user account",
      "Real-time incident alerts",
      "Community feed access",
      "Incident reporting",
      "Map tracking",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Family 1 Month",
    price: "N$1,000",
    duration: "30 Days",
    features: [
      "Up to 5 family members",
      "Real-time incident alerts",
      "Community feed access",
      "Incident reporting",
      "Map tracking",
      "Family group chat",
    ],
    popular: false,
  },
  {
    name: "Family 3 Months",
    price: "N$2,500",
    duration: "90 Days",
    savings: "Save N$500",
    features: [
      "Up to 5 family members",
      "Real-time incident alerts",
      "Community feed access",
      "Incident reporting",
      "Map tracking",
      "Family group chat",
      "Priority support",
    ],
    popular: false,
  },
  {
    name: "Tourist 30 Days",
    price: "N$1,800",
    duration: "30 Days",
    features: [
      "1 user account",
      "Real-time incident alerts",
      "Community feed access",
      "Incident reporting",
      "Map tracking",
      "Tourist safety guides",
      "Emergency contacts",
      "24/7 support",
    ],
    popular: false,
  },
  {
    name: "Business Monthly",
    price: "N$3,000",
    duration: "30 Days",
    features: [
      "Up to 20 team members",
      "Real-time incident alerts",
      "Community feed access",
      "Incident reporting",
      "Map tracking",
      "Business analytics dashboard",
      "Priority support",
      "Dedicated account manager",
    ],
    popular: false,
  },
];

function getWhatsAppUrl(planName: string, price: string) {
  const message = `Hi Ngumu's Eye Support, I would like to subscribe to the ${planName} of ${price}. Please advise how I can make payment?`;
  return `https://api.whatsapp.com/send/?phone=264816802064&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
}

export default function SubscribePage() {
  const [, setLocation] = useLocation();

  const handlePayNow = (planName: string, price: string) => {
    window.open(getWhatsAppUrl(planName, price), "_blank");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Subscribe" />

      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/profile")}
            data-testid="button-back-profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Choose a Plan</h2>
            <p className="text-sm text-muted-foreground">
              Select the subscription that works best for you
            </p>
          </div>
        </div>

        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.popular ? "border-primary border-2" : ""}
            data-testid={`card-plan-${plan.name.toLowerCase().replace(/ /g, "-")}`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.duration}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{plan.price}</p>
                  {plan.savings && (
                    <Badge variant="secondary" className="text-xs">
                      {plan.savings}
                    </Badge>
                  )}
                  {plan.popular && (
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      Most Popular
                    </Badge>
                  )}
                </div>
              </div>

              <Separator className="mb-3" />

              <ul className="space-y-2 mb-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => handlePayNow(plan.name, plan.price)}
                  data-testid={`button-pay-${plan.name.toLowerCase().replace(/ /g, "-")}`}
                >
                  Pay Now
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handlePayNow(plan.name, plan.price)}
                  data-testid={`button-whatsapp-${plan.name.toLowerCase().replace(/ /g, "-")}`}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
