'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Clock, X, Bell, Navigation } from 'lucide-react';
import { toast } from 'react-toastify';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const services = [
  { id: 1, name: 'AC Tune-Up', frequency: 'Once a year', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?q=80&w=300' },
  { id: 2, name: 'BBQ Cleaning & Repair', frequency: 'Once a year', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=300' },
  { id: 3, name: 'Carpet & Upholstery Cleaning', frequency: 'Every 2 times a year', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=300' },
  { id: 4, name: 'Dryer Vent Cleaning', frequency: 'Once a year', image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=300' },
  { id: 5, name: 'Duct Cleaning', frequency: 'Every 3 times a year', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?q=80&w=300' },
  { id: 6, name: 'Furnace Tune-Up', frequency: 'Once a year', image: 'https://images.unsplash.com/photo-1585128792020-803d29415281?q=80&w=300' },
  { id: 7, name: 'Gas Fireplace Tune-Up', frequency: 'Once a year', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?q=80&w=300' },
  { id: 8, name: 'Pest Control Annual Check-Up', frequency: 'Once a year', image: 'https://images.unsplash.com/photo-1632935190508-1c1e3f7e5b68?q=80&w=300' },
  { id: 9, name: 'Sprinkler Winterization', frequency: 'Once a year', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=300' },
  { id: 10, name: 'Window & Eaves Cleaning', frequency: '2 times a year', image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?q=80&w=300' },
  { id: 11, name: 'Yard Clean Up', frequency: '2 times a year', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=300' },
];

function formatSelectedMonths(monthIndices) {
  if (!monthIndices || monthIndices.length === 0) return '';
  const sorted = [...monthIndices].sort((a, b) => a - b);
  const names = sorted.map((i) => MONTHS_FULL[i]);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

function getExpertRecommendation(service) {
  if (!service) return '';
  if (service.frequency.includes('2 times')) return `Experts recommend ${service.name} every 6 months.`;
  if (service.frequency.includes('3 times')) return `Experts recommend ${service.name} every 4 months.`;
  return `Experts recommend an ${service.name} every year.`;
}

function ScheduleModal({ service, onClose, onConfirm }) {
  const [modalView, setModalView] = useState('main');
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [monthScrollStart, setMonthScrollStart] = useState(0);
  const [addressMode, setAddressMode] = useState('existing');
  const [savedAddress] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [chosenAddress, setChosenAddress] = useState('');

  useEffect(() => {
    const currentMonth = new Date().getMonth();
    setSelectedMonths([currentMonth]);
    setMonthScrollStart(Math.max(0, Math.min(currentMonth - 2, 7)));
  }, []);

  const toggleMonth = (monthIndex) => {
    setSelectedMonths((prev) =>
      prev.includes(monthIndex) ? prev.filter((m) => m !== monthIndex) : [...prev, monthIndex]
    );
  };

  const getFrequencyLabel = () => {
    if (selectedMonths.length === 0) return 'Select months';
    return `Every year in ${formatSelectedMonths(selectedMonths)}`;
  };

  const getNextReminderDate = () => {
    if (selectedMonths.length === 0) return '';
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const sorted = [...selectedMonths].sort((a, b) => a - b);
    let nextMonth = sorted.find((m) => m >= currentMonth);
    let nextYear = currentYear;
    if (nextMonth === undefined) {
      nextMonth = sorted[0];
      nextYear = currentYear + 1;
    }
    return `${MONTHS_FULL[nextMonth]} ${nextYear}`;
  };

  const visibleMonthIndices = Array.from({ length: 5 }, (_, i) => monthScrollStart + i).filter((i) => i < 12);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========== MAIN VIEW ========== */}
        {modalView === 'main' && (
          <div className="p-6">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-start mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Bell className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Schedule & Save $15 on {service.name.toLowerCase()} jobs
            </h2>

            <p className="text-sm font-semibold text-gray-700 mb-3">Remind me:</p>

            <button
              onClick={() => setModalView('frequency')}
              className="w-full flex items-center justify-between py-3 border-b border-gray-200"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 text-left">
                  {getFrequencyLabel()}
                </p>
                <div className="flex items-center gap-1 text-purple-600 text-xs">
                  <Clock className="w-3 h-3" />
                  <span>Next reminder: {getNextReminderDate()}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            <button
              onClick={() => setModalView('address')}
              className="w-full flex items-center justify-between py-3 border-b border-gray-200"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-gray-900">
                  {chosenAddress || 'Choose an address'}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            <p className="text-xs text-gray-400 text-center mt-4 mb-5 leading-relaxed">
              Change or cancel your reminders any time.
              <br />
              When your reminder is sent, you&apos;ll be able to confirm details with your Pro before any work begins.
            </p>

            <button
              onClick={onConfirm}
              className="w-full bg-[#6B4EAA] text-white py-3 rounded-full font-semibold hover:bg-[#5a3f94] transition-colors mb-2"
            >
              Confirm
            </button>

            <button
              onClick={onClose}
              className="w-full text-[#6B4EAA] py-2 rounded-full font-semibold hover:bg-gray-50 transition-colors text-sm"
            >
              Close
            </button>
          </div>
        )}

        {/* ========== FREQUENCY VIEW ========== */}
        {modalView === 'frequency' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setModalView('main')}
                className="flex items-center gap-1 text-gray-900 hover:text-gray-600 transition-colors text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
              Reminder Frequency
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
              When would you like to do your {service.name} Jobs?
            </p>

            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setMonthScrollStart((prev) => Math.max(0, prev - 1))}
                disabled={monthScrollStart === 0}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex-1 flex gap-2 justify-center">
                {visibleMonthIndices.map((monthIdx) => {
                  const isSelected = selectedMonths.includes(monthIdx);
                  return (
                    <button
                      key={monthIdx}
                      onClick={() => toggleMonth(monthIdx)}
                      className={`w-14 h-10 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-[#2D3BE6] text-white shadow-md'
                          : 'bg-yellow-50 border border-yellow-200 text-gray-700 hover:bg-yellow-100'
                      }`}
                    >
                      {MONTHS[monthIdx]}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setMonthScrollStart((prev) => Math.min(7, prev + 1))}
                disabled={monthScrollStart >= 7}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <span className="text-yellow-500 text-lg flex-shrink-0">&#9888;</span>
              <p className="text-sm text-gray-700">
                {getExpertRecommendation(service)}
              </p>
            </div>

            <div className="border border-gray-200 rounded-full px-4 py-3 mb-6 flex items-center gap-2 justify-center">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">
                {selectedMonths.length > 0
                  ? `Every year in ${formatSelectedMonths(selectedMonths)}`
                  : 'Select months above'}
              </span>
            </div>

            <button
              onClick={() => setModalView('main')}
              className="w-full bg-[#0E7480] text-white py-3.5 rounded-full font-semibold hover:bg-[#2570d4] transition-colors"
            >
              Save
            </button>
          </div>
        )}

        {/* ========== ADDRESS VIEW ========== */}
        {modalView === 'address' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setModalView('main')}
                className="flex items-center gap-1 text-gray-900 hover:text-gray-600 transition-colors text-sm font-medium"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 text-center mb-6">
              Which address is this for?
            </h2>

            <p className="text-sm font-semibold text-gray-900 mb-3">Pick an address</p>

            {addressMode === 'existing' ? (
              <div>
                <button
                  onClick={() => setChosenAddress(savedAddress)}
                  className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all mb-3 text-left ${
                    chosenAddress === savedAddress
                      ? 'border-[#0E7480] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Navigation className="w-5 h-5 text-[#0E7480] flex-shrink-0 mt-0.5 rotate-45" />
                  <span className="text-sm text-gray-900">{savedAddress}</span>
                </button>

                <button
                  onClick={() => { setAddressMode('new'); setChosenAddress(''); }}
                  className="text-[#0E7480] text-sm hover:underline mb-6 block"
                >
                  Enter a different address
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 mb-3">
                  <Navigation className="w-5 h-5 text-[#0E7480] flex-shrink-0 rotate-45" />
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="eg. 90 Tycos Drive, ON, CA"
                    className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none bg-transparent"
                  />
                </div>

                <div className="p-3 rounded-lg border border-gray-200 mb-3">
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Unit / Suite"
                    className="w-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none bg-transparent"
                  />
                </div>

                <button
                  onClick={() => { setAddressMode('existing'); setNewAddress(''); setNewUnit(''); }}
                  className="text-[#0E7480] text-sm hover:underline mb-6 block"
                >
                  Use an existing address
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (addressMode === 'new' && newAddress.trim()) {
                  const full = newUnit.trim() ? `${newAddress.trim()}, ${newUnit.trim()}` : newAddress.trim();
                  setChosenAddress(full);
                } else if (addressMode === 'existing' && !chosenAddress) {
                  setChosenAddress(savedAddress);
                }
                setModalView('main');
              }}
              className="w-full bg-[#0E7480] text-white py-3.5 rounded-full font-semibold hover:bg-[#2570d4] transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScheduleSavePage() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const firstBellRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (user) {
      const tutorialKey = `schedule_save_tutorial_${user.id}`;
      const hasSeenTutorial = localStorage.getItem(tutorialKey);
      if (!hasSeenTutorial) {
        const timer = setTimeout(() => {
          setShowTutorial(true);
          if (firstBellRef.current) {
            const rect = firstBellRef.current.getBoundingClientRect();
            setTooltipPos({
              top: rect.bottom + window.scrollY + 12,
              left: rect.left + window.scrollX - 40,
            });
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const dismissTutorial = () => {
    if (user) {
      localStorage.setItem(`schedule_save_tutorial_${user.id}`, 'true');
    }
    setShowTutorial(false);
  };

  const openModal = (service) => {
    if (showTutorial) dismissTutorial();
    setSelectedService(service);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedService(null);
  };

  const handleConfirm = () => {
    toast.info('Schedule reminder functionality coming soon');
    closeModal();
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-white relative">
      {/* ==================== TUTORIAL OVERLAY ==================== */}
      {showTutorial && (
        <div
          className="fixed inset-0 z-40 bg-black/60 cursor-pointer"
          onClick={dismissTutorial}
        />
      )}

      {showTutorial && (
        <div
          className="absolute z-50 bg-[#0E7480] text-white rounded-lg px-4 py-3 max-w-[220px] text-sm shadow-lg"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          <div className="absolute -top-2 left-12 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-[#0E7480]" />
          Create a new scheduled reminder for services you&apos;d like to repeat by tapping on the bell icon.
        </div>
      )}

      {/* ==================== SCHEDULE MODAL ==================== */}
      {showModal && selectedService && (
        <ScheduleModal
          service={selectedService}
          onClose={closeModal}
          onConfirm={handleConfirm}
        />
      )}

      {/* ==================== PAGE CONTENT ==================== */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Schedule & Save</h1>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-[#0E7480] hover:text-[#1e5bb8] transition-colors text-sm mb-8"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="underline">Back to Dashboard</span>
        </Link>

        {/* ==================== HERO BANNER ==================== */}
        <div className="relative rounded-2xl overflow-hidden mb-10 h-64 bg-gray-100">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 bg-gradient-to-r from-gray-200 to-gray-100 p-8 flex flex-col justify-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Schedule & Save</h2>
              <span className="inline-block bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 w-fit">
                Get $15 off!
              </span>
              <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                Stay on top of routine home maintenance with effortless planning.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                Get reminders when your next job is scheduled and <span className="underline font-medium">save $15 every time</span>.
              </p>
            </div>
            <div className="w-1/2 relative">
              <Image
                src="https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?q=80&w=800"
                alt="Lawn maintenance"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute bottom-8 right-1/3 w-20 h-20 bg-purple-500/80 rounded-full flex items-center justify-center">
                <Bell className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SUBSCRIPTION FREQUENCIES ==================== */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Subscription frequencies are recommended by experienced professionals.
          </h2>
          <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-full px-4 py-1.5 text-xs text-purple-600">
            <Clock className="w-3.5 h-3.5" />
            <span>Subscription frequencies are recommended by experienced professionals.</span>
          </div>
        </div>

        {/* ==================== SERVICE CARDS GRID ==================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {services.map((service, index) => (
            <div key={service.id} className="group">
              <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-purple-200 mb-2">
                <Image
                  src={service.image}
                  alt={service.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  ref={index === 0 ? firstBellRef : null}
                  onClick={() => openModal(service)}
                  className={`absolute bottom-2 left-2 w-10 h-10 bg-purple-600/80 rounded-full flex items-center justify-center hover:bg-purple-700/90 transition-colors ${
                    showTutorial && index === 0 ? 'z-50 ring-4 ring-blue-400 ring-offset-2' : ''
                  }`}
                >
                  <Bell className="w-5 h-5 text-white" />
                </button>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-0.5 leading-tight">
                {service.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-purple-600">
                <Clock className="w-3 h-3" />
                <span>{service.frequency}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
