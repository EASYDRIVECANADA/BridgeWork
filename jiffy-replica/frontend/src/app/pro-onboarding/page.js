'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle, Circle, ChevronRight, Building2, FileText,
  Shield, CreditCard, Clock, Loader2, AlertTriangle, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { onboardingAPI, paymentsAPI, servicesAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function ProOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [onboardingData, setOnboardingData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [services, setServices] = useState([]);

  // Step 1: Business Info
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessUnit, setBusinessUnit] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [website, setWebsite] = useState('');
  const [howHeard, setHowHeard] = useState('');

  // Step 2: Service Agreement
  const [agreement, setAgreement] = useState(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  // Step 3: Requirements
  const [selectedServices, setSelectedServices] = useState([]);
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [ref1Name, setRef1Name] = useState('');
  const [ref1Phone, setRef1Phone] = useState('');
  const [ref1Email, setRef1Email] = useState('');
  const [ref1Relationship, setRef1Relationship] = useState('');
  const [ref2Name, setRef2Name] = useState('');
  const [ref2Phone, setRef2Phone] = useState('');
  const [ref2Email, setRef2Email] = useState('');
  const [ref2Relationship, setRef2Relationship] = useState('');

  // Step 4: Stripe
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/pro-login');
      return;
    }
    if (profile?.role !== 'pro') {
      router.push('/');
      return;
    }
    loadOnboardingStatus();
    loadServices();
  }, [user, profile, router]);

  // Auto-complete Stripe step when returning from Stripe onboarding
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (stripeParam === 'success' && !submitting) {
      handleCompleteStripe();
      // Clean up the URL query param
      router.replace('/pro-onboarding', { scroll: false });
    }
  }, [searchParams]);

  const loadOnboardingStatus = async () => {
    try {
      const res = await onboardingAPI.getStatus();
      const data = res.data?.data;
      setOnboardingData(data);
      setCurrentStep(data?.currentStep || 0);

      // Pre-fill fields from saved data
      const p = data?.profile;
      if (p) {
        setBusinessName(p.business_name || '');
        setBusinessAddress(p.business_address || '');
        setBusinessUnit(p.business_unit || '');
        setGstNumber(p.gst_number || '');
        setWebsite(p.website || '');
        setHowHeard(p.how_heard || '');
        setSelectedServices(p.service_categories || []);
        setInsurancePolicyNumber(p.insurance_policy_number || '');
        setInsuranceProvider(p.insurance_provider || '');
        setInsuranceExpiry(p.insurance_expiry || '');
        setRef1Name(p.reference_1_name || '');
        setRef1Phone(p.reference_1_phone || '');
        setRef1Email(p.reference_1_email || '');
        setRef1Relationship(p.reference_1_relationship || '');
        setRef2Name(p.reference_2_name || '');
        setRef2Phone(p.reference_2_phone || '');
        setRef2Email(p.reference_2_email || '');
        setRef2Relationship(p.reference_2_relationship || '');
        setAgreementAccepted(p.service_agreement_accepted || false);
      }

      // If onboarding is complete and approved, redirect to dashboard
      if (data?.onboardingCompleted && data?.adminApproved) {
        router.push('/pro-dashboard');
        return;
      }
    } catch (err) {
      console.error('Failed to load onboarding status', err);
      toast.error('Failed to load onboarding status');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const res = await servicesAPI.getCategories();
      setServices(res.data?.data?.categories || []);
    } catch {
      // Fallback: load all services
      try {
        const res = await servicesAPI.getAll();
        const allServices = res.data?.data?.services || [];
        // Group by category
        const cats = {};
        allServices.forEach(s => {
          if (s.category_id && !cats[s.category_id]) {
            cats[s.category_id] = { id: s.category_id, name: s.category_name || s.category_id };
          }
        });
        setServices(Object.values(cats));
      } catch {
        console.log('Could not load services');
      }
    }
  };

  const loadAgreement = async () => {
    try {
      const res = await onboardingAPI.getAgreement();
      setAgreement(res.data?.data);
    } catch {
      toast.error('Failed to load service agreement');
    }
  };

  // Navigate to a step (only if allowed)
  const goToStep = (step) => {
    if (step <= (onboardingData?.currentStep || 0) + 1) {
      setCurrentStep(step);
      if (step === 2 && !agreement) {
        loadAgreement();
      }
    }
  };

  const handleSubmitStep1 = async () => {
    if (!businessName.trim() || !businessAddress.trim()) {
      toast.error('Business name and address are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await onboardingAPI.submitBusinessInfo({
        business_name: businessName.trim(),
        business_address: businessAddress.trim(),
        business_unit: businessUnit.trim() || undefined,
        gst_number: gstNumber.trim() || undefined,
        website: website.trim() || undefined,
        how_heard: howHeard.trim() || undefined,
      });
      toast.success('Business info saved!');
      await loadOnboardingStatus();
      goToStep(2);
      loadAgreement();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save business info');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitStep2 = async () => {
    if (!agreementAccepted) {
      toast.error('You must accept the service agreement to continue');
      return;
    }
    setSubmitting(true);
    try {
      await onboardingAPI.acceptAgreement({ accepted: true });
      toast.success('Service agreement accepted!');
      await loadOnboardingStatus();
      goToStep(3);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to accept agreement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitStep3 = async () => {
    if (selectedServices.length === 0) {
      toast.error('Select at least one service category');
      return;
    }
    if (!ref1Name.trim() || !ref1Phone.trim()) {
      toast.error('At least one professional reference is required');
      return;
    }
    setSubmitting(true);
    try {
      await onboardingAPI.submitRequirements({
        service_categories: selectedServices,
        insurance_policy_number: insurancePolicyNumber.trim() || undefined,
        insurance_provider: insuranceProvider.trim() || undefined,
        insurance_expiry: insuranceExpiry || undefined,
        reference_1_name: ref1Name.trim(),
        reference_1_phone: ref1Phone.trim(),
        reference_1_email: ref1Email.trim() || undefined,
        reference_1_relationship: ref1Relationship.trim() || undefined,
        reference_2_name: ref2Name.trim() || undefined,
        reference_2_phone: ref2Phone.trim() || undefined,
        reference_2_email: ref2Email.trim() || undefined,
        reference_2_relationship: ref2Relationship.trim() || undefined,
      });
      toast.success('Requirements saved!');
      await loadOnboardingStatus();
      goToStep(4);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save requirements');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStripeOnboard = async () => {
    setConnectLoading(true);
    try {
      const res = await paymentsAPI.connectOnboard();
      const data = res.data?.data;

      // If details already submitted, skip redirect and complete the step directly
      if (data?.details_submitted) {
        toast.success('Stripe account already connected!');
        await handleCompleteStripe();
        return;
      }

      const url = data?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Failed to get Stripe onboarding link');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create Stripe Connect account');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleCompleteStripe = async () => {
    setSubmitting(true);
    try {
      await onboardingAPI.completeStripe();
      toast.success('Onboarding complete! Your application is pending admin review.');
      await loadOnboardingStatus();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Stripe setup is not complete yet');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleService = (id) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
      </div>
    );
  }

  const progressPercent = onboardingData?.progressPercent || 0;
  const isCompleted = onboardingData?.onboardingCompleted;
  const isApproved = onboardingData?.adminApproved;
  const rejectionReason = onboardingData?.adminRejectionReason;
  const savedStep = onboardingData?.currentStep || 0;

  const stepConfig = [
    { num: 1, title: 'Start with the basics', desc: 'Fill in your business info', icon: Building2, time: '2 min' },
    { num: 2, title: 'Digital Service Agreement', desc: 'Review and accept the agreement', icon: FileText, time: '5 min' },
    { num: 3, title: 'Professional requirements', desc: 'Services, insurance, references', icon: Shield, time: '10 min' },
    { num: 4, title: 'Set up direct payment', desc: 'Connect your Stripe account', icon: CreditCard, time: '10 min' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">

        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Become a BridgeWork Pro</h1>
        <p className="text-gray-500 mb-2">
          Welcome {profile?.full_name || 'Pro'}
        </p>

        {/* Completed + Pending Approval */}
        {isCompleted && !isApproved && !rejectionReason && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <Clock className="w-6 h-6 text-blue-500 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-blue-900">Application Under Review</h2>
                <p className="text-sm text-blue-700 mt-1">
                  Your onboarding is complete! A BridgeWork admin will review your application shortly.
                  You'll be notified once approved.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Rejected */}
        {rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-red-900">Application Needs Attention</h2>
                <p className="text-sm text-red-700 mt-1">{rejectionReason}</p>
                <p className="text-sm text-red-600 mt-2">Please update your information and resubmit.</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {!isCompleted && (
          <>
            <p className="text-sm text-[#0E7480] font-semibold mb-2">{progressPercent}% Complete</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-[#0E7480] h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mb-8">Takes about 30 min to complete</p>
          </>
        )}

        {/* What info do I need? (only on overview) */}
        {currentStep === 0 && !isCompleted && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-48 h-32 bg-gradient-to-br from-[#0E7480]/10 to-[#0E7480]/5 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-12 h-12 text-[#0E7480]" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Setting up your account is quick and easy. Once approved, you'll be able to start taking on jobs right away!</p>
                <div className="mb-3">
                  <p className="text-sm font-bold text-gray-700 mb-1">Professional Requirements</p>
                  <ul className="text-xs text-gray-500 list-disc ml-4 space-y-0.5">
                    <li>Service License (if required)</li>
                    <li>Insurance Policy Number</li>
                    <li>2 Professional References</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-1">Setup Direct Payment</p>
                  <ul className="text-xs text-gray-500 list-disc ml-4 space-y-0.5">
                    <li>Bank Routing & Account Number</li>
                    <li>Government ID for verification</li>
                  </ul>
                </div>
              </div>
            </div>
            <button
              onClick={() => goToStep(1)}
              className="mt-6 w-full bg-[#0E7480] text-white py-3 rounded-lg font-semibold hover:bg-[#0c6670] transition-colors"
            >
              I'm ready to start
            </button>
          </div>
        )}

        {/* Steps Overview (always visible when not on overview) */}
        {(currentStep === 0 && !isCompleted) && (
          <div className="space-y-4">
            {stepConfig.map((step) => {
              const completed = savedStep >= step.num;
              const active = savedStep + 1 === step.num || (savedStep === 0 && step.num === 1);
              return (
                <div
                  key={step.num}
                  className={`bg-white rounded-xl shadow-sm border p-5 cursor-pointer transition-all ${
                    active ? 'border-[#0E7480] ring-1 ring-[#0E7480]/20' : 'border-gray-100'
                  } ${completed ? 'opacity-75' : ''}`}
                  onClick={() => goToStep(step.num)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                        completed ? 'bg-green-100 text-green-600' : active ? 'bg-[#0E7480] text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {completed ? <CheckCircle className="w-5 h-5" /> : step.num}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
                        <p className="text-xs text-gray-500">{step.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">Takes about {step.time}</span>
                      {active && !completed && (
                        <button className="bg-[#0E7480] text-white text-xs px-4 py-1.5 rounded-lg font-semibold hover:bg-[#0c6670]">
                          Start
                        </button>
                      )}
                      {completed && (
                        <span className="text-xs text-green-600 font-semibold">Done</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── STEP 1: Business Info ─── */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setCurrentStep(0)} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
                ← Go back
              </button>
              <span className="text-xs text-gray-300 mx-2">|</span>
              <span className="text-xs bg-[#0E7480] text-white px-2 py-0.5 rounded-full">1</span>
              <span className="text-sm font-semibold text-gray-700">Start with the basics</span>
            </div>
            <h2 className="text-xl font-bold text-[#0E7480] mt-4 mb-6">Fill in your business info</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Name <span className="text-red-500">*</span></label>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. BridgeWork Inc." className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Business Address <span className="text-red-500">*</span></label>
                <input type="text" value={businessAddress} onChange={e => setBusinessAddress(e.target.value)}
                  placeholder="e.g. 123 Plumber's Lane, Toronto, ON, Canada" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
              </div>
              <div className="max-w-xs">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Unit/Suite <span className="text-gray-400">(optional)</span></label>
                <input type="text" value={businessUnit} onChange={e => setBusinessUnit(e.target.value)}
                  placeholder="e.g. 4" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">GST Number</label>
                <p className="text-xs text-[#0E7480] mb-1.5 cursor-help">ⓘ Why do we need this?</p>
                <div className="flex gap-2 items-center">
                  <input type="text" value={gstNumber} onChange={e => setGstNumber(e.target.value)}
                    placeholder="123456789" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                  <span className="text-sm font-medium text-gray-500">RT</span>
                  <input type="text" placeholder="0001" className="w-20 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Website <span className="text-gray-400">(optional)</span></label>
                <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
                  placeholder="e.g. www.mybusiness.com" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Where did you learn about BridgeWork? <span className="text-gray-400">(optional)</span></label>
                <textarea value={howHeard} onChange={e => setHowHeard(e.target.value)}
                  placeholder="Tell us where you learned about BridgeWork" rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none resize-none" />
              </div>
            </div>

            {/* Insurance Acknowledgment (like Jiffy) */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 leading-relaxed">
                By checking this box you represent and warrant that you hold all required or industry standard insurance,
                workers compensation, and workplace safety, to adequately cover property damage, bodily injury, theft,
                property loss in amounts sufficient for your liability under your contract with the Requesting User.
              </p>
            </div>

            <button onClick={handleSubmitStep1} disabled={submitting}
              className="mt-6 w-full bg-[#0E7480] text-white py-3 rounded-lg font-semibold hover:bg-[#0c6670] transition-colors disabled:opacity-50">
              {submitting ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}

        {/* ─── STEP 2: Digital Service Agreement ─── */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setCurrentStep(0)} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
                ← Go back
              </button>
              <span className="text-xs text-gray-300 mx-2">|</span>
              <span className="text-xs bg-[#0E7480] text-white px-2 py-0.5 rounded-full">2</span>
              <span className="text-sm font-semibold text-gray-700">Digital Service Agreement</span>
            </div>

            <h2 className="text-xl font-bold text-[#0E7480] mt-4 mb-2">BridgeWork Pro Digital Service Agreement</h2>
            <p className="text-xs text-gray-400 mb-6">Version {agreement?.version || '1.0'} | Effective Date: {agreement?.agreement?.effectiveDate || '2026-01-01'}</p>

            {/* Commission Rate Highlight */}
            {agreement && (
              <div className="bg-[#0E7480]/5 border border-[#0E7480]/20 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-[#0E7480]">
                  Your Platform Commission Rate: {agreement.commissionPercent}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This rate is set by BridgeWork and is visible in your account settings. Only a BridgeWork administrator can adjust this rate.
                </p>
              </div>
            )}

            {/* Agreement Sections */}
            {agreement ? (
              <div className="space-y-2 mb-6 max-h-[400px] overflow-y-auto pr-2">
                {agreement.agreement.sections.map((section, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSection(expandedSection === i ? null : i)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <span className="text-sm font-semibold text-gray-800">{section.title}</span>
                      {expandedSection === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                    {expandedSection === i && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}

            {/* Accept Checkbox */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreementAccepted}
                  onChange={(e) => setAgreementAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#0E7480] border-gray-300 rounded focus:ring-[#0E7480]"
                />
                <span className="text-sm text-gray-700">
                  I have read, understand, and agree to the BridgeWork Pro Digital Service Agreement.
                  I acknowledge that the platform commission rate of <strong>{agreement?.commissionPercent || 15}%</strong> applies
                  to all completed service transactions. I confirm that I hold all required insurance
                  and licenses for the services I intend to provide.
                </span>
              </label>
            </div>

            <button onClick={handleSubmitStep2} disabled={submitting || !agreementAccepted}
              className="w-full bg-[#0E7480] text-white py-3 rounded-lg font-semibold hover:bg-[#0c6670] transition-colors disabled:opacity-50">
              {submitting ? 'Processing...' : 'I Agree and Continue'}
            </button>
          </div>
        )}

        {/* ─── STEP 3: Professional Requirements ─── */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setCurrentStep(0)} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
                ← Go back
              </button>
              <span className="text-xs text-gray-300 mx-2">|</span>
              <span className="text-xs bg-[#0E7480] text-white px-2 py-0.5 rounded-full">3</span>
              <span className="text-sm font-semibold text-gray-700">Professional requirements</span>
            </div>
            <h2 className="text-xl font-bold text-[#0E7480] mt-4 mb-6">Select your services & provide requirements</h2>

            {/* Select Services */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Select your services <span className="text-red-500">*</span></h3>
              <div className="grid grid-cols-2 gap-2">
                {services.length > 0 ? services.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => toggleService(cat.id)}
                    className={`px-3 py-2 text-xs rounded-lg border transition-colors text-left ${
                      selectedServices.includes(cat.id)
                        ? 'bg-[#0E7480] text-white border-[#0E7480]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#0E7480]'
                    }`}
                  >
                    {cat.name}
                  </button>
                )) : (
                  <p className="text-xs text-gray-400 col-span-2">Loading services...</p>
                )}
              </div>
            </div>

            {/* Insurance */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Insurance <span className="text-gray-400">(if required)</span></h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Insurance Provider</label>
                  <input type="text" value={insuranceProvider} onChange={e => setInsuranceProvider(e.target.value)}
                    placeholder="e.g. Aviva Canada" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Insurance Policy Number</label>
                  <input type="text" value={insurancePolicyNumber} onChange={e => setInsurancePolicyNumber(e.target.value)}
                    placeholder="Policy number" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                </div>
                <div className="max-w-xs">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Insurance Expiry Date</label>
                  <input type="date" value={insuranceExpiry} onChange={e => setInsuranceExpiry(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                </div>
              </div>
            </div>

            {/* References */}
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-800 mb-3">Professional References <span className="text-red-500">*</span></h3>

              {/* Reference 1 */}
              <p className="text-xs font-semibold text-gray-600 mb-2">Reference 1</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input type="text" value={ref1Name} onChange={e => setRef1Name(e.target.value)}
                  placeholder="Full Name *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                <input type="tel" value={ref1Phone} onChange={e => setRef1Phone(e.target.value)}
                  placeholder="Phone *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                <input type="email" value={ref1Email} onChange={e => setRef1Email(e.target.value)}
                  placeholder="Email (optional)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                <input type="text" value={ref1Relationship} onChange={e => setRef1Relationship(e.target.value)}
                  placeholder="Relationship (optional)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
              </div>

              {/* Reference 2 */}
              <p className="text-xs font-semibold text-gray-600 mb-2">Reference 2 <span className="text-gray-400">(optional)</span></p>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={ref2Name} onChange={e => setRef2Name(e.target.value)}
                  placeholder="Full Name" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                <input type="tel" value={ref2Phone} onChange={e => setRef2Phone(e.target.value)}
                  placeholder="Phone" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                <input type="email" value={ref2Email} onChange={e => setRef2Email(e.target.value)}
                  placeholder="Email" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                <input type="text" value={ref2Relationship} onChange={e => setRef2Relationship(e.target.value)}
                  placeholder="Relationship" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
              </div>
            </div>

            <button onClick={handleSubmitStep3} disabled={submitting}
              className="w-full bg-[#0E7480] text-white py-3 rounded-lg font-semibold hover:bg-[#0c6670] transition-colors disabled:opacity-50">
              {submitting ? 'Saving...' : 'Continue'}
            </button>
          </div>
        )}

        {/* ─── STEP 4: Stripe Connect ─── */}
        {currentStep === 4 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setCurrentStep(0)} className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1">
                ← Go back
              </button>
              <span className="text-xs text-gray-300 mx-2">|</span>
              <span className="text-xs bg-[#0E7480] text-white px-2 py-0.5 rounded-full">4</span>
              <span className="text-sm font-semibold text-gray-700">Set up direct payment</span>
            </div>
            <h2 className="text-xl font-bold text-[#0E7480] mt-4 mb-2">Set up direct payment</h2>
            <p className="text-sm text-gray-500 mb-6">
              You'll be redirected to a secure page on Stripe, BridgeWork's payment processor. This is where you'll set up
              your bank account for receiving payouts.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">What info should I have ready?</p>
              <ul className="text-xs text-gray-500 list-disc ml-4 space-y-1">
                <li>Bank routing number & account number</li>
                <li>Government-issued ID (for identity verification)</li>
                <li>Business information (if applicable)</li>
              </ul>
            </div>

            {onboardingData?.profile?.stripe_account_id ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <p className="text-sm font-semibold text-green-700">Stripe account connected</p>
                  </div>
                  <p className="text-xs text-green-600 mt-1">Account ID: {onboardingData.profile.stripe_account_id}</p>
                </div>
                <button onClick={handleCompleteStripe} disabled={submitting}
                  className="w-full bg-[#0E7480] text-white py-3 rounded-lg font-semibold hover:bg-[#0c6670] transition-colors disabled:opacity-50">
                  {submitting ? 'Verifying...' : 'Complete Onboarding'}
                </button>
              </div>
            ) : (
              <button onClick={handleStripeOnboard} disabled={connectLoading}
                className="w-full bg-[#0E7480] text-white py-3 rounded-lg font-semibold hover:bg-[#0c6670] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {connectLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting to Stripe...
                  </>
                ) : (
                  'Start Stripe Setup'
                )}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
