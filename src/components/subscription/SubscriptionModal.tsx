import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Crown, 
  Zap, 
  Award, 
  CheckCircle2, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SubscriptionTier } from '../../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    subscriptionPlans, 
    upgradeSubscription, 
    showToast 
  } = useApp();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('pro');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'checkout' | 'success'>('select');

  // Checkout form fields
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState(currentUser?.name || 'Jordan Lee');
  const [zipCode, setZipCode] = useState('90210');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState('');

  if (!isOpen) return null;

  const currentPlan = subscriptionPlans.find((p) => p.id === selectedTier) || subscriptionPlans[1];
  const basePrice = billingCycle === 'monthly' ? currentPlan.priceMonthly : Math.round(currentPlan.priceAnnual / 12);
  const finalPrice = Math.max(0, basePrice - (basePrice * couponDiscount) / 100);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (code === 'VCU100' || code === 'COMMUNITY100' || code === 'FREEPASS') {
      setCouponDiscount(100);
      setCouponMessage('100% Lifetime VIP Access Applied! 🎉');
    } else if (code === 'VAUGHAN20' || code === 'LAUNCH20' || code === 'VCU20') {
      setCouponDiscount(20);
      setCouponMessage('20% Vaughan Code University Discount Applied! ⚡');
    } else {
      setCouponDiscount(0);
      setCouponMessage('Invalid promo code. Try VCU100 or VAUGHAN20');
    }
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      await upgradeSubscription(selectedTier, {
        cardNumber,
        billingCycle,
        finalPrice,
      });
      setStep('success');
    } catch {
      showToast({
        title: 'Payment Failed',
        message: 'Could not process card. Please try again.',
        type: 'warning',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div 
        id="subscription-modal-container"
        className="bg-slate-900 border border-slate-700/80 w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">
              {step === 'select' && 'Select Your Vaughan Code University Membership Tier'}
              {step === 'checkout' && 'Secure 256-Bit SSL Checkout Gateway'}
              {step === 'success' && 'Welcome to Pro Scholar Membership! 🎉'}
            </h3>
          </div>
          <button
            onClick={onClose}
            id="close-subscription-modal-btn"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5">
          {/* STEP 1: SELECT PLAN */}
          {step === 'select' && (
            <div className="space-y-4">
              
              {/* Header copy & Billing toggle */}
              <div className="text-center max-w-xl mx-auto space-y-1.5">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Unlock Full Access to All Teachings & Masterclasses
                </h2>
                <p className="text-xs text-slate-400">
                  Join hundreds of scholars accelerating their growth with full video modules, audio series, PDF workbooks, and certification tests.
                </p>

                {/* Monthly vs Annual billing switch */}
                <div className="inline-flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs mt-1">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                      billingCycle === 'monthly' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      billingCycle === 'annual' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Annual (Save 20%)</span>
                    <span className="text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded font-black">
                      FREE 2 MO
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                {subscriptionPlans.map((plan) => {
                  const isSelected = selectedTier === plan.id;
                  const isCurrent = currentUser?.subscriptionTier === plan.id;
                  const price = billingCycle === 'monthly' ? plan.priceMonthly : Math.round(plan.priceAnnual / 12);

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedTier(plan.id)}
                      id={`plan-card-${plan.id}`}
                      className={`rounded-xl p-4 border flex flex-col justify-between transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                          : 'bg-slate-850 bg-slate-800/60 border-slate-700/70 hover:border-slate-600'
                      }`}
                    >
                      {plan.badgeText && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow">
                          {plan.badgeText}
                        </span>
                      )}

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-white">{plan.name}</h4>
                            <p className="text-[11px] text-slate-400 line-clamp-1">{plan.description}</p>
                          </div>
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">${price}</span>
                          <span className="text-[11px] text-slate-400">/month</span>
                        </div>

                        {/* Feature Checklist */}
                        <ul className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-700/60">
                          {plan.features.slice(0, 4).map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-1.5 text-[11px] leading-tight">
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-2">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTier(plan.id);
                          if (plan.id !== 'free') setStep('checkout');
                        }}
                        className={`w-full mt-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                      >
                        {isCurrent
                          ? 'Current Active Plan'
                          : plan.id === 'free'
                          ? 'Stay on Free Tier'
                          : `Select ${plan.name}`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Proceed CTA */}
              {selectedTier !== 'free' && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Instant access • Cancel anytime with 1-click</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('checkout')}
                    id="proceed-to-checkout-btn"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          )}

          {/* STEP 2: SECURE CHECKOUT & PAYMENT GATEWAY */}
          {step === 'checkout' && (
            <form onSubmit={handleConfirmPayment} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* Left Column: Credit Card Details Form (7 cols) */}
                <div className="md:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-400" />
                      <span>Payment Information</span>
                    </h3>
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>256-Bit SSL Encrypted</span>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      required
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Card Number</label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Expiry Date</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Security CVC</label>
                      <input
                        type="text"
                        required
                        placeholder="CVC"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Promo Code Entry */}
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">Promo / Faculty Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. VCU100 or VAUGHAN20"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMessage && (
                      <p className={`text-[11px] mt-1 font-medium ${couponDiscount > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {couponMessage}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column: Order Summary (5 cols) */}
                <div className="md:col-span-5 bg-slate-800/70 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-700 pb-2">
                      Order Summary
                    </h4>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-white">{currentPlan.name} Tier</span>
                      <span className="font-mono text-slate-300">${basePrice}/mo</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>Billing Cycle</span>
                      <span className="capitalize">{billingCycle}</span>
                    </div>

                    {couponDiscount > 0 && (
                      <div className="flex justify-between items-center text-xs text-emerald-400 font-semibold">
                        <span>Discount ({couponDiscount}%)</span>
                        <span>-${basePrice - finalPrice}/mo</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-700 flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Total Due Today</span>
                      <div className="text-right">
                        <span className="text-lg font-black text-amber-400">${finalPrice}</span>
                        <span className="text-[10px] text-slate-400 block">Billed {billingCycle}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      id="confirm-payment-btn"
                      className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <span>Authorizing Transaction...</span>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Complete ${finalPrice} Purchase</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('select')}
                      className="w-full py-1.5 text-center text-slate-400 hover:text-white text-xs font-medium cursor-pointer"
                    >
                      ← Back to plan selection
                    </button>
                  </div>
                </div>

              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === 'success' && (
            <div className="py-6 text-center space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Welcome to {currentPlan.name}!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your account has been upgraded with full access to all video masterclasses, audio modules, and quizzes. +150 XP awarded!
                </p>
              </div>

              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-xs text-slate-300">
                <span>Receipt sent to: </span>
                <span className="font-semibold text-white">{currentUser?.email || 'your email'}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                id="subscription-success-done-btn"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Go to Classroom & Start Learning →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
