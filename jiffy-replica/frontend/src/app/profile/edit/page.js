'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Lock, CreditCard, Shield, Camera } from 'lucide-react';
import { updateProfile } from '@/store/slices/authSlice';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

export default function EditProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const { user, profile } = useSelector((state) => state.auth);

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('English');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Address state
  const [allowLawnSigns, setAllowLawnSigns] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [addressInput, setAddressInput] = useState('');
  const [unitSuite, setUnitSuite] = useState('');

  // Credit card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (profile) {
      const nameParts = (profile.full_name || '').split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(profile.email || user?.email || '');
      setPhone(profile.phone || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [user, profile, router]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        toast.error('Failed to upload avatar');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success('Avatar uploaded');
    } catch (err) {
      toast.error('Failed to upload avatar');
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await dispatch(updateProfile({
        full_name: fullName,
        phone: phone,
        avatar_url: avatarUrl || undefined,
      })).unwrap();
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = () => {
    if (!addressInput.trim()) return;
    setAddresses([...addresses, { address: addressInput, unit: unitSuite }]);
    setAddressInput('');
    setUnitSuite('');
    toast.success('Address added');
  };

  const handleAddCard = () => {
    toast.info('Credit card functionality coming soon');
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + ' / ' + v.substring(2, 4);
    }
    return v;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header with tabs */}
        <div className="mb-8">
          <div className="flex items-center gap-8 border-b border-gray-200">
            <h1 className="text-3xl font-bold text-gray-900 pb-4">Edit Profile</h1>
            <div className="flex items-center gap-8 ml-auto">
              <Link
                href="/profile/edit"
                className="text-[#2D7FE6] hover:text-[#1e5bb8] pb-4 border-b-2 border-[#2D7FE6] font-medium"
              >
                Edit Profile
              </Link>
              <Link
                href="/credits"
                className="text-gray-600 hover:text-gray-900 pb-4"
              >
                Credits
              </Link>
            </div>
          </div>
        </div>

        {/* ==================== PROFILE SECTION ==================== */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="flex gap-8">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    )}
                  </div>
                  <button
                    onClick={handleAvatarClick}
                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#2D7FE6] rounded-full flex items-center justify-center text-white hover:bg-[#1e5bb8] transition-colors shadow-md"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="flex-1 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-[#2D7FE6] mb-2">Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#2D7FE6] text-gray-900 mb-3"
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#2D7FE6] text-gray-900"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-[#2D7FE6] mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-200 rounded bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone Number"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#2D7FE6] text-gray-900"
                  />
                </div>

                {/* Language Preference */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Preferred Language for Communications & Emails
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          language === 'English'
                            ? 'border-[#2D7FE6] bg-[#2D7FE6]'
                            : 'border-gray-300'
                        }`}
                        onClick={() => setLanguage('English')}
                      >
                        {language === 'English' && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-700">English</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          language === 'Francais'
                            ? 'border-[#2D7FE6] bg-[#2D7FE6]'
                            : 'border-gray-300'
                        }`}
                        onClick={() => setLanguage('Francais')}
                      >
                        {language === 'Francais' && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-gray-700">Français</span>
                    </label>
                  </div>
                </div>

                {/* Action links and Save button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-6">
                    <button className="text-sm text-[#2D7FE6] hover:text-[#1e5bb8] font-medium hover:underline">
                      Change Password
                    </button>
                    <button className="text-sm text-red-500 hover:text-red-600 font-medium hover:underline">
                      Delete Account
                    </button>
                  </div>
                  <button
                    onClick={handleSaveChanges}
                    disabled={saving}
                    className="px-6 py-2.5 bg-[#2D7FE6] text-white rounded font-medium hover:bg-[#1e5bb8] transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== ADDRESS SECTION ==================== */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Address</h2>
          </div>

          {/* Allow Lawn Signs Toggle */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setAllowLawnSigns(!allowLawnSigns)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                allowLawnSigns ? 'bg-[#2D7FE6]' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  allowLawnSigns ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">Allow Lawn Signs</span>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            {/* Empty state message */}
            {addresses.length === 0 && (
              <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-8">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-sm text-amber-800">
                  You have no address. Add an address to get started.
                </span>
              </div>
            )}

            {/* Saved addresses list */}
            {addresses.length > 0 && (
              <div className="mb-6 space-y-3">
                {addresses.map((addr, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#2D7FE6]" />
                      <span className="text-sm text-gray-700">
                        {addr.address}{addr.unit ? `, ${addr.unit}` : ''}
                      </span>
                    </div>
                    <button
                      onClick={() => setAddresses(addresses.filter((_, i) => i !== index))}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Address form */}
            <div>
              <label className="block text-xs font-bold text-gray-900 tracking-wider mb-2">ADDRESS</label>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <MapPin className="w-5 h-5 text-[#2D7FE6]" />
                  </div>
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="ex. 90 Tycos Drive, ON, CA"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#2D7FE6] text-gray-900 text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={unitSuite}
                  onChange={(e) => setUnitSuite(e.target.value)}
                  placeholder="Unité / Suite"
                  className="w-32 px-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#2D7FE6] text-gray-900 text-sm"
                />
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={handleAddAddress}
                  className="px-6 py-2.5 bg-[#2D7FE6] text-white rounded font-medium hover:bg-[#1e5bb8] transition-colors text-sm"
                >
                  Add Address
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== CREDIT CARDS SECTION ==================== */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Credit Cards</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            {/* Empty state message */}
            <div className="flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-8">
              <CreditCard className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-amber-800">
                You have no payment details. Save your credit card for ease of payment.
              </span>
            </div>

            {/* Card input form */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 1234 1234 1234"
                  maxLength={19}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#2D7FE6] text-gray-900 text-sm"
                />
                {/* Card brand badges */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <div className="w-8 h-5 bg-green-600 rounded-sm flex items-center justify-center">
                    <span className="text-white text-[8px] font-bold">link</span>
                  </div>
                  <div className="w-8 h-5 bg-gradient-to-r from-red-500 to-yellow-500 rounded-sm flex items-center justify-center">
                    <div className="flex">
                      <div className="w-3 h-3 bg-red-500 rounded-full opacity-80"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full opacity-80 -ml-1.5"></div>
                    </div>
                  </div>
                  <div className="w-8 h-5 bg-gray-800 rounded-sm flex items-center justify-center">
                    <span className="text-white text-[7px] font-bold">••••</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                  placeholder="MM / YY"
                  maxLength={7}
                  className="w-24 pl-10 pr-2 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#2D7FE6] text-gray-900 text-sm"
                />
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Lock className="w-4 h-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="CVC"
                  maxLength={4}
                  className="w-20 pl-10 pr-2 py-2.5 border border-gray-300 rounded focus:outline-none focus:border-[#2D7FE6] text-gray-900 text-sm"
                />
              </div>
            </div>

            {/* Secure payment note and Add Card button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-[#2D7FE6] font-medium">Secure Payment Processing</span>
              </div>
              <button
                onClick={handleAddCard}
                className="px-6 py-2.5 bg-[#2D7FE6] text-white rounded font-medium hover:bg-[#1e5bb8] transition-colors text-sm"
              >
                Add Card
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
