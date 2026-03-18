'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Search, CheckCircle, Clock, Shield, Star, CalendarDays, Sparkles, Wrench, MessageSquareText, ArrowRight, Paintbrush, Zap, Droplets, Wind, Send, MapPin, Truck, BadgeCheck } from 'lucide-react';
import { fetchCategories } from '@/store/slices/servicesSlice';
import ServiceCategoryCard from '@/components/ServiceCategoryCard';
import ServiceSearchBar from '@/components/ServiceSearchBar';
import TestimonialCard from '@/components/TestimonialCard';
import Image from 'next/image';

export default function HomePage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { categories } = useSelector((state) => state.services);
  const [searchQuery, setSearchQuery] = useState('');
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('What do you need help with?');
  const [activeProIndex, setActiveProIndex] = useState(0);
  const [activeProDirection, setActiveProDirection] = useState(1);
  const [activeTimelineStep, setActiveTimelineStep] = useState(0);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    // Typewriter placeholder animation (pauses when user types)
    if (searchQuery?.length) return;

    const phrases = [
      'What do you need help with today?',
      'Repaint my house',
      'Fix a leaky faucet in Ottawa'
    ];

    const typingSpeedMs = 55;
    const deletingSpeedMs = 28;
    const holdAfterTypedMs = 1200;
    const holdAfterDeletedMs = 400;

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId;

    const tick = () => {
      const current = phrases[phraseIndex];

      if (!isDeleting) {
        charIndex = Math.min(charIndex + 1, current.length);
        setAnimatedPlaceholder(current.slice(0, charIndex));

        if (charIndex === current.length) {
          timeoutId = setTimeout(() => {
            isDeleting = true;
            tick();
          }, holdAfterTypedMs);
          return;
        }

        timeoutId = setTimeout(tick, typingSpeedMs);
        return;
      }

      // deleting
      charIndex = Math.max(charIndex - 1, 0);
      setAnimatedPlaceholder(current.slice(0, charIndex));

      if (charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        timeoutId = setTimeout(tick, holdAfterDeletedMs);
        return;
      }

      timeoutId = setTimeout(tick, deletingSpeedMs);
    };

    tick();
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const samplePros = [
    { name: 'Ava', service: 'Interior Painting', badge: 'Background checked', rating: 5.0, eta: '8 min', note: 'Bringing supplies + tape.' },
    { name: 'Noah', service: 'Electrical Install', badge: 'Insured & verified', rating: 4.8, eta: '11 min', note: 'Confirming your fixture type.' },
    { name: 'Maya', service: 'Plumbing Fix', badge: 'Top rated in your area', rating: 4.9, eta: '9 min', note: 'On the way—see you soon.' },
    { name: 'Jaimie', service: 'Appliance Repair', badge: 'BridgeWork Certified Pro', rating: 4.9, eta: '7 min', note: 'Diagnosing before arrival.' },
  ];

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => {
      setActiveProDirection(1);
      setActiveProIndex((i) => (i + 1) % samplePros.length);
    }, 3200);
    return () => clearInterval(id);
  }, [prefersReducedMotion]); // samplePros is static

  const timelineSteps = [
    { title: 'Request sent', subtitle: 'We received your details', icon: Send },
    { title: 'Pro matched', subtitle: 'Certified pro accepted', icon: BadgeCheck },
    { title: 'En route', subtitle: 'Live ETA and updates', icon: Truck },
    { title: 'Completed', subtitle: 'Receipt saved automatically', icon: CheckCircle },
  ];

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => {
      setActiveTimelineStep((s) => (s + 1) % timelineSteps.length);
    }, 2400);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  const handleSearch = (query) => {
    if (query.trim()) {
      router.push(`/services?q=${encodeURIComponent(query)}`);
    }
  };

  const testimonials = [
    {
      id: 1,
      name: 'Sarah Johnson',
      rating: 5,
      comment: 'Amazing service! My handyman arrived within 30 minutes and fixed everything perfectly.',
      avatar: 'https://via.placeholder.com/100',
      service: 'Furniture Assembly'
    },
    {
      id: 2,
      name: 'Michael Chen',
      rating: 5,
      comment: 'Professional, quick, and affordable. Highly recommend BridgeWork for any home repairs!',
      avatar: 'https://via.placeholder.com/100',
      service: 'Plumbing Repair'
    },
    {
      id: 3,
      name: 'Emily Rodriguez',
      rating: 5,
      comment: 'The pro was courteous and did an excellent job. Will definitely use again!',
      avatar: 'https://via.placeholder.com/100',
      service: 'TV Mounting'
    }
  ];

  const features = [
    {
      icon: <Clock className="w-8 h-8 text-[#0E7480]" />,
      title: '10-Minute Response',
      description: 'Get matched with a certified pro in under 10 minutes'
    },
    {
      icon: <Shield className="w-8 h-8 text-[#0E7480]" />,
      title: 'Protection Promise',
      description: 'All pros are background-checked and insured'
    },
    {
      icon: <Star className="w-8 h-8 text-[#0E7480]" />,
      title: 'Top-Rated Pros',
      description: 'Only the best professionals with 4.8+ ratings'
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-[#0E7480]" />,
      title: 'Satisfaction Guaranteed',
      description: 'We resolve any issues or your money back'
    }
  ];

  const howItWorksSteps = [
    {
      title: 'Tell us what you need',
      description: 'Choose a service and share a few details in seconds.',
      icon: CalendarDays,
    },
    {
      title: 'We match you fast',
      description: 'Nearby, available pros get notified instantly.',
      icon: Sparkles,
    },
    {
      title: 'A pro gets it done',
      description: 'Vetted pros arrive ready with the right tools.',
      icon: Wrench,
    },
    {
      title: 'Track and message live',
      description: 'Updates, chat, and receipts—always in one place.',
      icon: MessageSquareText,
    },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[400px] sm:min-h-[500px] lg:h-[600px] flex items-center justify-center overflow-hidden py-8 sm:py-0">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=2000"
            alt="Kitchen background"
            fill
            className="object-cover"
            priority
          />
          {/* Brand-tinted overlay (keeps original hero intact, looks more premium) */}
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 bg-[#0E7480]/20 mix-blend-multiply" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="mx-auto max-w-3xl rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 shadow-[0_30px_80px_rgba(0,0,0,0.30)] px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold tracking-wide text-white/90 ring-1 ring-white/15 mb-3 sm:mb-5">
              <span className="h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full bg-[#0E7480]" />
              <span className="hidden sm:inline">Fast matching. Transparent pricing. Trusted pros.</span>
              <span className="sm:hidden">Fast matching. Trusted pros.</span>
            </div>

            <h1 className="font-brand text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6 leading-[1.1] sm:leading-[1.05] tracking-tight drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
              Home services booked when you need them.
            </h1>

            {/* Search Box */}
            <div className="max-w-2xl mx-auto mb-3 sm:mb-5">
              <div className="bg-white/95 rounded-xl sm:rounded-2xl shadow-xl flex items-center px-4 sm:px-6 py-3 sm:py-4 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#0E7480]/40 transition">
                <Search className="w-5 sm:w-6 h-5 sm:h-6 text-gray-400 mr-3 sm:mr-4 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={animatedPlaceholder}
                  className="flex-1 text-gray-900 text-sm sm:text-lg outline-none placeholder:text-gray-400 bg-transparent min-w-0"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                />
              </div>
            </div>

            {/* Help Text */}
            <p className="text-white/90 text-sm mb-6">
              Need help finding the right service?{' '}
              <button
                type="button"
                onClick={() => window.__openHelpChat?.()}
                className="underline underline-offset-4 hover:text-white"
              >
                Chat with us
              </button>
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => router.push('/services?type=residential')}
                className="btn-brand px-8 py-3 rounded-xl font-brand tracking-tight"
              >
                Residential
              </button>
              <button
                onClick={() => router.push('/services?type=commercial')}
                className="px-8 py-3 rounded-xl font-brand tracking-tight text-white border border-white/30 hover:bg-white/10 transition-all duration-200"
              >
                Commercial
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats and Social Proof Section */}
      <section className="py-10 sm:py-12 lg:py-16 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4">
          {/* Description Text */}
          <div className="max-w-4xl mx-auto text-center mb-6 sm:mb-8 lg:mb-10">
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 leading-relaxed">
              Small jobs around the house are as good as done, with no shopping around. 
              BridgeWork connects you with certified Ottawa pros who are already in your area and will complete your job at 
              transparent rates you can feel good about.
            </p>
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <button
              onClick={() => router.push('/services')}
              className="btn-brand px-6 sm:px-8 lg:px-10 py-3 sm:py-4 text-sm sm:text-base lg:text-lg font-brand tracking-tight"
            >
              Book Now
            </button>
          </div>
        </div>
      </section>

      {/* Section 1: Video Showcase */}
      <section className="py-10 sm:py-12 lg:py-16 bg-transparent">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            whileHover={{ y: -4 }}
            className="relative rounded-3xl p-[2px] bg-[linear-gradient(90deg,#0E7480,#142841,#024B5A)] shadow-2xl shadow-black/10"
          >
            <div className="relative rounded-[22px] bg-black/5 overflow-hidden ring-1 ring-black/10">
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-semibold text-[#042E5C] ring-1 ring-black/5">
                  <span className="h-2 w-2 rounded-full bg-[#0E7480]" />
                  See how it works
                </span>
              </div>
              <video 
                className="w-full aspect-video object-cover"
                controls
                poster="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=2000"
              >
                <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 2: Get a Confirmed Appointment */}
      <section className="py-20 bg-blue-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Card Image */}
            <div className="flex justify-center">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="w-full max-w-[360px]"
              >
                {/* Phone-style preview */}
                <div className="relative rounded-[36px] p-[2px] bg-[linear-gradient(90deg,#0E7480,#142841,#024B5A)] shadow-2xl shadow-black/10">
                  <div className="relative rounded-[34px] bg-white/90 backdrop-blur p-6 ring-1 ring-black/5 overflow-hidden">

                    {/* Top bar */}
                    <div className="relative flex items-center justify-between text-[11px] text-gray-500">
                      <span className="font-semibold tracking-wide">BridgeWork</span>
                      <span className="font-medium">9:41</span>
                    </div>

                    <div className="relative mt-5">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0E7480] ring-1 ring-[#0E7480]/20">
                        <span className="inline-block h-2 w-2 rounded-full bg-[#0E7480]" />
                        MATCH CONFIRMED
                      </div>
                      <div className="mt-3 text-gray-700">Hi Jess,</div>
                    </div>

                    {/* Fixed height slide area */}
                    <div className="relative mt-4 h-[210px]">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={activeProIndex}
                          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 36 * activeProDirection, scale: 0.98 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -36 * activeProDirection, scale: 0.98 }}
                          transition={{ duration: 0.38, ease: 'easeOut' }}
                          className="absolute inset-0"
                        >
                          <div className="font-brand text-xl font-extrabold tracking-tight text-gray-900">
                            {samplePros[activeProIndex].name} is on the way.
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            Your <span className="font-semibold text-gray-900">{samplePros[activeProIndex].service}</span> pro accepted your request.
                          </div>

                          <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-black/5 shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-2xl grid place-items-center bg-[#0E7480] text-white font-extrabold shadow-sm">
                                {samplePros[activeProIndex].name.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-semibold text-gray-900">{samplePros[activeProIndex].name}</div>
                                  <div className="text-sm text-gray-600 flex items-center gap-1 shrink-0">
                                    <Star className="w-4 h-4 text-[#0E7480] fill-[#0E7480]" />
                                    <span className="font-semibold">{samplePros[activeProIndex].rating.toFixed(1)}</span>
                                  </div>
                                </div>
                                <div className="mt-0.5 text-xs text-gray-600 flex items-center gap-1">
                                  <Shield className="w-3.5 h-3.5 text-[#0E7480]" />
                                  <span className="line-clamp-1">{samplePros[activeProIndex].badge}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                              <span className="text-xs font-semibold text-[#042E5C] bg-[#0E7480]/10 rounded-full px-2 py-1">
                                ETA {samplePros[activeProIndex].eta}
                              </span>
                              <span className="text-xs text-gray-600 line-clamp-1">
                                {samplePros[activeProIndex].note}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="relative flex items-center justify-center gap-2 mt-4">
                      {samplePros.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={`Show pro ${i + 1}`}
                          onClick={() => {
                            setActiveProDirection(i > activeProIndex ? 1 : -1);
                            setActiveProIndex(i);
                          }}
                          className={
                            "h-2 w-2 rounded-full transition-all " +
                            (i === activeProIndex ? "bg-[#0E7480] w-6" : "bg-gray-300 hover:bg-gray-400")
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right: Text Content */}
            <div>
              <h2 className="font-brand text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                Get a confirmed appointment in minutes.
              </h2>
              <div className="flex items-start gap-3 mb-6">
                <Clock className="w-6 h-6 text-[#0E7480] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-[#0E7480] font-semibold mb-2">Average 10 minute response time</p>
                  <p className="text-gray-600">
                    Your request instantly goes out to our network of pros who are nearby, available, and ready to take on your job.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/services')}
                className="btn-brand px-8 py-4 text-lg font-brand tracking-tight"
              >
                Find me a pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Guaranteed Jobs by Certified Professionals */}
      <section className="py-20 bg-transparent">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div>
              <h2 className="font-brand text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                Guaranteed jobs by certified professionals.
              </h2>
              <div className="flex items-start gap-3 mb-6">
                <CheckCircle className="w-6 h-6 text-yellow-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-[#0E7480] font-semibold mb-2">Homeowner Protection Promise</p>
                  <p className="text-gray-600">
                    Professionals on BridgeWork are licensed, well-rated, and background-checked. If your experience isn't perfect, we'll make it right.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/services')}
                className="btn-brand px-8 py-4 text-lg font-brand tracking-tight"
              >
                Learn more
              </button>
            </div>

            {/* Right: Animated job timeline mock */}
            <div className="flex justify-center">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="w-full max-w-[440px]"
              >
                <div className="relative rounded-[36px] p-[2px] bg-[linear-gradient(90deg,#0E7480,#142841,#024B5A)] shadow-2xl shadow-black/10">
                  <div className="relative rounded-[34px] bg-white/90 backdrop-blur p-6 ring-1 ring-black/5 overflow-hidden">

                    {/* Top bar */}
                    <div className="relative flex items-center justify-between text-[11px] text-gray-500">
                      <span className="font-semibold tracking-wide">BridgeWork</span>
                      <span className="font-medium">Live status</span>
                    </div>

                    {/* Location pill */}
                    <div className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0E7480] ring-1 ring-[#0E7480]/20">
                      <MapPin className="w-4 h-4" />
                      Ottawa, ON
                    </div>

                    {/* Progress */}
                    <div className="relative mt-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-brand text-lg font-extrabold tracking-tight text-gray-900">
                          Your job is moving
                        </div>
                        <div className="text-xs font-semibold text-gray-600">
                          Step {activeTimelineStep + 1}/{timelineSteps.length}
                        </div>
                      </div>

                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <motion.div
                          initial={false}
                          animate={{ width: `${((activeTimelineStep + 1) / timelineSteps.length) * 100}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="h-full bg-[#0E7480]"
                        />
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="relative mt-6 space-y-3">
                      {timelineSteps.map((step, idx) => {
                        const Icon = step.icon;
                        const isActive = idx === activeTimelineStep;
                        const isDone = idx < activeTimelineStep;
                        return (
                          <motion.div
                            key={step.title}
                            initial={false}
                            animate={{
                              opacity: isActive ? 1 : 0.7,
                              scale: isActive ? 1 : 0.99,
                            }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className={
                              "flex items-center gap-3 rounded-2xl px-4 py-3 ring-1 transition " +
                              (isActive
                                ? "bg-white shadow-sm ring-[#0E7480]/20"
                                : "bg-white/70 ring-black/5")
                            }
                          >
                            <div
                              className={
                                "h-10 w-10 rounded-2xl grid place-items-center shadow-sm " +
                                (isDone || isActive
                                  ? "bg-[#0E7480] text-white"
                                  : "bg-gray-100 text-gray-600")
                              }
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900">{step.title}</div>
                              <div className="text-sm text-gray-600">{step.subtitle}</div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: How It Works */}
      <section className="py-20 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="font-brand text-4xl md:text-5xl font-extrabold text-gray-900 text-center mb-16 tracking-tight"
          >
            How it works
          </motion.h2>

          <div className="grid md:grid-cols-4 gap-6 lg:gap-8 mb-12">
            {howItWorksSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.65 }}
                  transition={{ duration: 0.45, ease: 'easeOut', delay: idx * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="group relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 hover:shadow-xl hover:shadow-black/10 transition-shadow"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="h-12 w-12 rounded-2xl grid place-items-center bg-[#0E7480] shadow-sm">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-sm font-semibold text-[#042E5C]/60">
                      0{idx + 1}
                    </div>
                  </div>

                  <div className="font-brand text-lg font-extrabold text-gray-900 tracking-tight mb-2">
                    {step.title}
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>

                  <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(14,116,128,0.10),transparent_55%)]" />
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center">
            <button
              onClick={() => router.push('/services')}
              className="btn-brand px-10 py-4 text-lg font-brand tracking-tight gap-2"
            >
              Start booking my service <ArrowRight className="w-5 h-5 opacity-90" />
            </button>
          </div>
        </div>
      </section>

      {/* Section 5: What People in Boston Are Doing Now */}
      <section className="py-20 bg-transparent">
        <div className="max-w-6xl mx-auto px-4">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="font-brand text-4xl md:text-5xl font-extrabold text-gray-900 text-center tracking-tight"
          >
            What people in Ottawa are doing now
          </motion.h2>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
            className="text-center text-gray-600 mt-3 mb-10"
          >
            Pick a popular service, see a pro preview, and book in minutes.
          </motion.p>

          <div className="rounded-3xl bg-white/60 backdrop-blur-sm ring-1 ring-black/5 shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-6 sm:p-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#042E5C] ring-1 ring-black/5">
                  <span className="h-2 w-2 rounded-full bg-[#0E7480]" />
                  Trending in your area
                </div>
                <div className="font-brand text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-3">
                  Choose a service to book today
                </div>
              </div>

              <button
                onClick={() => router.push('/services')}
                className="btn-brand px-7 py-3 rounded-2xl font-brand tracking-tight inline-flex items-center gap-2 self-start md:self-auto"
              >
                Browse all services <ArrowRight className="w-5 h-5 opacity-90" />
              </button>
            </div>

            {/* Services grid */}
            <div className="grid md:grid-cols-2 gap-4 lg:gap-6">
                {[
                  { title: 'Painting', subtitle: 'Touch-ups to full rooms', icon: Paintbrush, chip: 'Same‑week availability' },
                  { title: 'Electrical', subtitle: 'Fixtures & installs', icon: Zap, chip: 'Licensed pros' },
                  { title: 'Plumbing', subtitle: 'Leaks, clogs, and fixes', icon: Droplets, chip: 'Emergency slots' },
                  { title: 'Heating & Cooling', subtitle: 'Tune-ups and repairs', icon: Wind, chip: 'Seasonal checkups' },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.title}
                      type="button"
                      onClick={() => router.push('/services')}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 0.45, ease: 'easeOut', delay: idx * 0.05 }}
                      whileHover={{ y: -4 }}
                      className="text-left group relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 hover:shadow-xl hover:shadow-black/10 transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="h-12 w-12 rounded-2xl grid place-items-center bg-[#0E7480] shadow-sm">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-brand text-lg font-extrabold text-gray-900 tracking-tight">
                              {item.title}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#0E7480] transition-colors mt-1" />
                      </div>

                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0E7480]/10 px-3 py-1 text-xs font-semibold text-[#042E5C]">
                        {item.chip}
                      </div>

                      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(14,116,128,0.10),transparent_55%)]" />
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          </div>

          {/* keep a small bottom spacer for visual breathing */}
        </div>
      </section>
    </div>
  );
}
