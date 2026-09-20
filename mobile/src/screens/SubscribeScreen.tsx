import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { colors, spacing, fontSize } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { userApi } from '../lib/api';
import { User } from '../lib/types';
import { isPaySmeTown, isValidPaySmeMobile, normalizePaySmeMobile } from '../lib/paysme';

const appLogo = require('../../assets/logo.jpg');

interface Plan {
  code: string;
  name: string;
  subtitle: string;
  price: string;
  duration: string;
  features: string[];
  popular?: boolean;
}

interface PaymentDetails {
  mobile: string;
  email: string;
  town: string;
}

const PAYSME_MERCHANT_ID = 'ae4dc707-394b-43cc-9610-0e7eaed46bdb';
const PAYSME_API_KEY = 'pk_7bccd2d76dc24665a8dec6a6fd9d0abc';

function planAmount(plan: Plan) {
  return Number(plan.price.replace(/[^0-9.]/g, ''));
}

function isValidPaymentDetails(details: PaymentDetails) {
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim());
  return isValidPaySmeMobile(details.mobile) && validEmail && isPaySmeTown(details.town);
}

function buildPaySmeHtml(plan: Plan, details: PaymentDetails, userId: string, requestCycle: number) {
  const invoiceId = requestCycle === 0 ? plan.name : `${plan.name} ${requestCycle + 1}`;
  const requestId = `NGUMU__${userId}__${plan.code}__${requestCycle}`;
  const config = {
    container: '#paysme-request-button',
    vendor_uuid: PAYSME_MERCHANT_ID,
    api_key: PAYSME_API_KEY,
    invoice_id: invoiceId,
    amount_nad: planAmount(plan),
    mobile: normalizePaySmeMobile(details.mobile),
    email: details.email.trim(),
    town: details.town.trim(),
    idempotency_key: `mobile-order-v2-${requestId}`,
    metadata: { user_id: userId, plan_code: plan.code },
    show_notification: false,
  };

  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
      #paysme-request-button { width: 100%; min-height: 72px; }
      button { width: 100% !important; border-radius: 10px !important; white-space: nowrap !important; font-size: 16px !important; padding-left: 12px !important; padding-right: 12px !important; }
    </style>
  </head>
  <body>
    <div id="paysme-request-button"></div>
    <script>
      function send(type, payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload || null }));
      }
      function renderButton() {
        if (!window.PaySME || !window.PaySME.renderRequestToPayButton) {
          send('error', { message: 'PaySME checkout did not load. Please try again.' });
          return;
        }
        var config = ${JSON.stringify(config)};
        config.on_request_sent = function(result) { send('request_sent', result); };
        config.on_already_paid = function(result) { send('already_paid', result); };
        config.on_error = function(error) { send('error', { message: error && error.message ? error.message : String(error), status: error && error.status, code: error && error.code }); };
        window.PaySME.renderRequestToPayButton(config);
      }
    </script>
    <script src="https://www.paysme.site/sdk/v1/paysme.js" onload="renderButton()" onerror="send('error', { message: 'Unable to load PaySME. Check your connection and try again.' })"></script>
  </body>
</html>`;
}

const individualPlans: Plan[] = [
  {
    code: "individual_1m",
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
    code: "individual_3m",
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
    code: "individual_6m",
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
    code: "individual_12m",
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
    code: "family_1m",
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
    code: "family_3m",
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
    code: "family_6m",
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
    code: "family_12m",
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
    code: "tourist_5d",
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
    code: "tourist_10d",
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
    code: "tourist_14d",
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
    code: "tourist_30d",
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

function PlanCard({ plan, onRequestPayment }: { plan: Plan; onRequestPayment: (plan: Plan) => void }) {
  return (
    <View style={[styles.planCard, plan.popular && styles.planCardPopular]}>
      {plan.popular && (
        <View style={styles.popularBadgeContainer}>
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>Most Popular</Text>
          </View>
        </View>
      )}
      <View style={[styles.planCardContent, plan.popular && { paddingTop: 8 }]}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planSubtitle}>{plan.subtitle}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          <Text style={styles.planDuration}>/ {plan.duration}</Text>
        </View>

        <View style={styles.featuresList}>
          {plan.features.map((feature) => (
            <View key={feature} style={styles.featureItem}>
              <Ionicons name="checkmark" size={14} color="#22c55e" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.payButton}
          onPress={() => onRequestPayment(plan)}
        >
          <View style={styles.payButtonIcon}>
            <View style={styles.payButtonIconFill} />
          </View>
          <Text style={styles.payButtonText}>Create Payment Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SubscribeScreen() {
  const navigation = useNavigation<any>();
  const [user, setUser] = useState<User | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentWebViewKey, setPaymentWebViewKey] = useState(0);
  const [requestCycle, setRequestCycle] = useState(0);
  const [requestSent, setRequestSent] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false);
  const successNoticeX = useRef(new Animated.Value(360)).current;
  const successNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (successNoticeTimer.current) clearTimeout(successNoticeTimer.current);
  }, []);

  const showSuccessNotice = () => {
    if (successNoticeTimer.current) clearTimeout(successNoticeTimer.current);
    successNoticeX.setValue(360);
    Animated.spring(successNoticeX, {
      toValue: 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    }).start();
    successNoticeTimer.current = setTimeout(() => {
      Animated.timing(successNoticeX, {
        toValue: 360,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setRequestSent(false));
    }, 5000);
  };

  useEffect(() => {
    userApi.getProfile().then(res => {
      setUser(res.data);
      if (res.data && !isValidPaymentDetails({
        mobile: res.data.phone || '',
        email: res.data.email || '',
        town: res.data.town || '',
      })) {
        Alert.alert(
          'Complete your profile',
          'Add a valid mobile number and select your town before accessing membership payments.',
          [{ text: 'Go to Profile', onPress: () => navigation.navigate('Main', { screen: 'Profile' }) }],
        );
      }
    }).catch(() => {});
  }, [navigation]);

  const openPaymentRequest = (plan: Plan) => {
    if (!user || !isValidPaymentDetails({ mobile: user.phone, email: user.email, town: user.town })) {
      Alert.alert(
        'Complete your profile',
        'Add a valid mobile number and select your town before creating a payment request.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Profile', onPress: () => navigation.navigate('Main', { screen: 'Profile' }) },
        ],
      );
      return;
    }
    setRequestSent(false);
    setPendingPayment(false);
    setRequestCycle(0);
    setSelectedPlan(plan);
  };

  const closePaymentRequest = () => {
    setSelectedPlan(null);
    setRequestSent(false);
    setPendingPayment(false);
  };

  const resendPendingPayment = () => {
    setPendingPayment(false);
    setRequestSent(false);
    setPaymentWebViewKey((key) => key + 1);
  };

  const handlePaySmeMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'request_sent') {
        setPendingPayment(false);
        setRequestSent(true);
        showSuccessNotice();
      } else if (message.type === 'already_paid') {
        setPendingPayment(false);
        setRequestSent(false);
        setRequestCycle((cycle) => cycle + 1);
        setPaymentWebViewKey((key) => key + 1);
        Alert.alert('Previous request paid', 'You can now create a new payment request.');
      } else if (message.type === 'error') {
        const errorMessage = String(message.payload?.message || '');
        const isPendingConflict = /idempotency|already being processed/i.test(errorMessage);
        if (isPendingConflict) {
          setPendingPayment(true);
          setRequestSent(false);
        } else if (/cancelled|failed/i.test(errorMessage)) {
          setRequestCycle((cycle) => cycle + 1);
          setPaymentWebViewKey((key) => key + 1);
          Alert.alert('Payment request ended', 'You can create a new payment request.');
        } else {
          Alert.alert('Payment request failed', 'The SMS could not be sent. Please try again.');
        }
      }
    } catch {
      Alert.alert('Payment request failed', 'PaySME returned an unexpected response. Please try again.');
    }
  };

  const hasActiveSubscription = user?.subscriptionStatus === 'active' && user?.subscriptionExpiry;
  const daysRemaining = hasActiveSubscription && user?.subscriptionExpiry
    ? Math.max(0, Math.ceil((new Date(user.subscriptionExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const formattedExpiry = hasActiveSubscription && user?.subscriptionExpiry
    ? new Date(user.subscriptionExpiry).toLocaleDateString()
    : '';

  const handleRedeemVoucher = async () => {
    if (!voucherCode.trim()) return;
    setRedeeming(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { Alert.alert('Error', 'Not authenticated'); return; }
      const userId = authUser.id;
      const code = voucherCode.trim().toUpperCase();

      const { data, error: rpcError } = await supabase.rpc('redeem_voucher', {
        voucher_code: code,
      });

      if (rpcError) {
        Alert.alert('Error', rpcError.message || 'Invalid or already used voucher code');
        return;
      }

      Alert.alert('Success', 'Voucher redeemed! Your subscription has been activated.');
      setVoucherCode('');
      const res = await userApi.getProfile();
      setUser(res.data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to redeem voucher');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Profile' })} style={{ marginRight: 8 }}>
            <Ionicons name="arrow-back" size={20} color={colors.cardForeground} />
          </TouchableOpacity>
          <Image source={appLogo} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Membership Packages</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={20} color={colors.mutedForeground} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {hasActiveSubscription && (
          <View style={styles.activeSubCard}>
            <Text style={styles.activeSubTitle}>Active Subscription</Text>
            <Text style={styles.activeSubDescription}>
              You currently have an active {user?.subscriptionPlanName || user?.subscriptionType} subscription
            </Text>
            <View style={styles.expiryRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.mutedForeground} />
              <Text style={styles.expiryText}>Expires: {formattedExpiry}</Text>
            </View>
            <Text style={styles.daysRemainingText}>{daysRemaining} days remaining</Text>
            <View style={styles.caseDeckButtonRow}>
              <TouchableOpacity
                style={styles.caseDeckButton}
                onPress={() => navigation.navigate('Main', { screen: 'CaseDeck' } as any)}
              >
                <Text style={styles.caseDeckButtonText}>Go to My Case Deck</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.voucherCard}>
          <View style={styles.voucherHeader}>
            <Ionicons name="ticket-outline" size={20} color={colors.primary} />
            <Text style={styles.voucherTitle}>Redeem Voucher</Text>
          </View>
          <Text style={styles.voucherDescription}>Have a voucher code? Enter it below to activate your subscription.</Text>
          <View style={styles.voucherInputRow}>
            <TextInput
              style={styles.voucherInput}
              placeholder="Enter voucher code"
              placeholderTextColor={colors.mutedForeground}
              value={voucherCode}
              onChangeText={setVoucherCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.redeemButton, (!voucherCode.trim() || redeeming) && { opacity: 0.5 }]}
              onPress={handleRedeemVoucher}
              disabled={!voucherCode.trim() || redeeming}
            >
              {redeeming ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={styles.redeemButtonText}>Redeem</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Individual Plans</Text>
          <Text style={styles.sectionSubtitle}>Perfect for personal safety and security</Text>
          {individualPlans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} onRequestPayment={openPaymentRequest} />
          ))}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Family Plans</Text>
          <Text style={styles.sectionSubtitle}>Protect your whole family together</Text>
          {familyPlans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} onRequestPayment={openPaymentRequest} />
          ))}
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Tourist Plans</Text>
          <Text style={styles.sectionSubtitle}>Short-term coverage for visitors</Text>
          {touristPlans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} onRequestPayment={openPaymentRequest} />
          ))}
        </View>

        <View style={styles.whatsappCard}>
          <Ionicons name="chatbubble-ellipses" size={32} color="#22c55e" />
          <Text style={styles.whatsappTitle}>Ready to subscribe?</Text>
          <Text style={styles.whatsappDescription}>
            Contact us on WhatsApp to complete your payment and activate your subscription
          </Text>
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={() => Linking.openURL(getGeneralWhatsAppUrl())}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color="#ffffff" />
            <Text style={styles.whatsappButtonText}>Contact on WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <Modal visible={!!selectedPlan} transparent animationType="slide" onRequestClose={closePaymentRequest}>
        <View style={styles.modalBackdrop}>
          {requestSent && (
            <Animated.View
              pointerEvents="none"
              style={[styles.successNotice, { transform: [{ translateX: successNoticeX }] }]}
            >
              <Ionicons name="checkmark-circle" size={22} color="#f6b91a" />
              <Text style={styles.successNoticeText}>Request to Pay Sent. Check your SMS.</Text>
            </Animated.View>
          )}
          <View style={styles.paymentModal}>
            <View style={styles.paymentModalHeader}>
              <Text style={styles.paymentModalTitle}>Create Payment Request</Text>
            </View>

            {selectedPlan && user ? (
              <>
                <View style={styles.paymentPlanSummary}>
                  <Text style={styles.paymentPlanName}>{selectedPlan.name}</Text>
                  <Text style={styles.paymentPlanSubtitle}>{selectedPlan.subtitle}</Text>
                  <View style={styles.paymentPlanPriceRow}>
                    <Text style={styles.paymentPlanPrice}>{selectedPlan.price}</Text>
                    <Text style={styles.paymentPlanDuration}> / {selectedPlan.duration}</Text>
                  </View>
                  <View style={styles.paymentFeatureList}>
                    {selectedPlan.features.map((feature) => (
                      <View key={feature} style={styles.paymentFeatureRow}>
                        <Ionicons name="checkmark" size={17} color="#22c55e" />
                        <Text style={styles.paymentFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={styles.paymentHelpText}>
                  Request to Pay SMS link will be sent via PaySME to mobile number {user.phone}.
                </Text>
                {pendingPayment ? (
                  <View style={styles.pendingPaymentNotice}>
                    <Text style={styles.pendingPaymentTitle}>Payment request pending</Text>
                    <Text style={styles.pendingPaymentText}>
                      A payment request for {selectedPlan.name} is already pending. Resend the same SMS link and PaySME code?
                    </Text>
                    <TouchableOpacity style={styles.resendButton} onPress={resendPendingPayment}>
                      <Text style={styles.resendButtonText}>Resend SMS</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.paySmeWebViewContainer}>
                    <WebView
                      key={paymentWebViewKey}
                      source={{ html: buildPaySmeHtml(selectedPlan, {
                        mobile: user.phone,
                        email: user.email,
                        town: user.town,
                      }, user.id, requestCycle) }}
                      originWhitelist={['*']}
                      javaScriptEnabled
                      domStorageEnabled
                      scrollEnabled={false}
                      onMessage={handlePaySmeMessage}
                      style={styles.paySmeWebView}
                    />
                  </View>
                )}
                <TouchableOpacity style={styles.paymentCancelButton} onPress={closePaymentRequest}>
                  <Text style={styles.paymentCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.destructive,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  activeSubCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(29, 155, 240, 0.3)',
  },
  activeSubTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  activeSubDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  expiryText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  daysRemainingText: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  caseDeckButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  caseDeckButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  caseDeckButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardPopular: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  popularBadgeContainer: {
    alignItems: 'center',
    marginTop: -12,
  },
  popularBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  planCardContent: {
    padding: 16,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  planSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  planDuration: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  featuresList: {
    marginBottom: 16,
    gap: 6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: colors.cardForeground,
  },
  payButton: {
    backgroundColor: '#1f2a24',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  payButtonIcon: {
    width: 36,
    height: 28,
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonIconFill: {
    width: 14,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#f5b91f',
  },
  whatsappCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: spacing.md,
  },
  whatsappTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardForeground,
    marginTop: 12,
    marginBottom: 4,
  },
  whatsappDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 16,
  },
  whatsappButton: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  whatsappButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  bottomSpacing: {
    height: 40,
  },
  voucherCard: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  voucherTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  voucherDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  voucherInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.cardForeground,
  },
  redeemButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  redeemButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryForeground,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  successNotice: {
    position: 'absolute',
    top: 18,
    right: 12,
    zIndex: 30,
    elevation: 30,
    width: '78%',
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#17211c',
    borderWidth: 1,
    borderColor: '#f6b91a',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  successNoticeText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  paymentModal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '65%',
    paddingBottom: 32,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  paymentModalHeader: {
    marginBottom: 14,
  },
  paymentModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  paymentPlanSummary: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  paymentPlanName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  paymentPlanSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  paymentPlanPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 8,
  },
  paymentPlanPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  paymentPlanDuration: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  paymentFeatureList: {
    gap: 3,
  },
  paymentFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  paymentFeatureText: {
    fontSize: 13,
    color: colors.cardForeground,
  },
  paymentHelpText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  paySmeWebViewContainer: {
    width: '100%',
    height: 92,
    overflow: 'hidden',
  },
  paySmeWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  pendingPaymentNotice: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0b429',
    backgroundColor: '#fff8e1',
    padding: 14,
  },
  pendingPaymentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  pendingPaymentText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: 12,
  },
  resendButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#1f2a24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  paymentCancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  paymentCancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
});
