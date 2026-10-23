import React, { useState, useEffect } from 'react';
import {
  getProfile,
  updateProfile,
  listAddresses,
  addAddress,
  deleteAddress,
  recordLocationConsent,
  signOut,
  Address,
  UserProfile,
  listPaymentMethods,
  PaymentMethod
} from '../services/ownly-api.ts';

interface ProfileScreenProps {
  onSignOut: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onSignOut }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  // Add Address Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [label, setLabel] = useState<'Home' | 'Office' | "Friend's place" | 'Other'>('Office');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [area, setArea] = useState('OMR');
  const [pincode, setPincode] = useState('600113');
  const [isDefault, setIsDefault] = useState(false);

  // GPS consent state
  const [locationConsent, setLocationConsent] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, addrs, pms] = await Promise.all([
        getProfile(),
        listAddresses(),
        listPaymentMethods()
      ]);
      setProfile(p);
      setNameInput(p.full_name);
      setPhoneInput(p.phone || '');
      setLocationConsent(p.location_consent);
      setAddresses(addrs);
      setPaymentMethods(pms);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    try {
      const updated = await updateProfile({
        full_name: nameInput.trim(),
        phone: phoneInput.trim()
      });
      setProfile(updated);
      setIsEditingProfile(false);
      showToast('Profile updated successfully');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleConsent = async () => {
    const next = !locationConsent;
    setLocationConsent(next);
    await recordLocationConsent(next);
    showToast(next ? 'Location telemetry enabled for Chennai drop-offs' : 'Location consent disabled');
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line1.trim() || !pincode.trim()) return;

    await addAddress({
      label,
      line1: line1.trim(),
      line2: line2.trim() || undefined,
      landmark: landmark.trim() || undefined,
      area,
      city: 'Chennai',
      pincode: pincode.trim(),
      is_default: isDefault
    });

    setShowAddModal(false);
    setLine1('');
    setLine2('');
    setLandmark('');
    loadData();
    showToast('New address added to your Chennai profile');
  };

  const handleDeleteAddress = async (id: string) => {
    await deleteAddress(id);
    loadData();
    showToast('Address removed');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (loading || !profile) {
    return <div className="py-20 text-center text-sm text-[#576177]">Loading profile...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col gap-6">
        {toastMessage && (
          <div className="p-3.5 rounded-2xl bg-[#111D35] text-white text-xs font-bold flex items-center gap-2 shadow-md">
            <span className="material-symbols-outlined text-[18px] text-[#F50062]">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#111D35] text-white font-black text-xl flex items-center justify-center shadow-xs border border-[#F0D7E2]">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-[#111D35]">{profile.full_name}</h1>
                <p className="text-xs text-[#576177]">{profile.email}</p>
                <p className="text-xs text-[#111D35] font-semibold mt-0.5">{profile.phone}</p>
              </div>
            </div>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="py-1.5 px-3.5 rounded-full bg-[#FFF1F6] hover:bg-[#FFE3ED] border border-[#F0D7E2] text-xs font-bold text-[#C40054] transition-colors"
            >
              {isEditingProfile ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {isEditingProfile && (
            <form onSubmit={handleSaveProfile} className="pt-3 border-t border-[#F0D7E2] flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-[#111D35] block mb-1">Full Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full h-10 px-3.5 bg-[#FFF9FC] border border-[#F0D7E2] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#C40054]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#111D35] block mb-1">Phone Number (optional)</label>
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full h-10 px-3.5 bg-[#FFF9FC] border border-[#F0D7E2] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#C40054]"
                />
              </div>
              <button
                type="submit"
                className="py-2.5 px-5 rounded-full bg-[#C40054] hover:bg-[#A80047] text-xs font-bold text-white w-fit self-end shadow-xs"
              >
                Save Profile
              </button>
            </form>
          )}

          {/* Location Consent & Map Pin Explanation */}
          <div className="pt-3 border-t border-[#F0D7E2] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#16845A]">my_location</span>
                <div>
                  <span className="text-xs font-bold text-[#111D35] block">Location Access for Chennai Deliveries</span>
                  <p className="text-[11px] text-[#576177]">
                    We use your location solely to guide your Rapido Captain directly to your exact office tower gate or apartment block.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                <input
                  type="checkbox"
                  checked={locationConsent}
                  onChange={handleToggleConsent}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-[#E5E9EE] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C40054]"></div>
              </label>
            </div>

            {locationConsent && (
              <div className="p-2.5 bg-[#E5F6ED] rounded-xl text-xs text-[#125F43] flex items-center gap-2 mt-1 border border-[#16845A]/20">
                <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                <span>Active GPS Anchor: 12.9863° N, 80.2432° E (Chennai Tech Corridor)</span>
              </div>
            )}
          </div>
        </div>

        {/* Saved Addresses Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#111D35]">Saved Addresses</h2>
              <p className="text-xs text-[#576177]">Chennai delivery drop points</p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="py-1.5 px-3.5 rounded-full bg-[#FFF1F6] hover:bg-[#FFE3ED] border border-[#F0D7E2] text-xs font-bold text-[#C40054] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Address</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="p-4 bg-[#FFF9FC] rounded-2xl border border-[#F0D7E2]/70 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#111D35]">{addr.label}</span>
                    {addr.is_default && (
                      <span className="text-[10px] bg-[#E5F6ED] text-[#125F43] font-extrabold px-1.5 py-0.2 rounded uppercase border border-[#16845A]/20">
                        Default
                      </span>
                    )}
                    <span className="text-xs text-[#576177]">{addr.area}, Chennai</span>
                  </div>
                  <p className="text-xs text-[#111D35]">{addr.line1}</p>
                  {addr.line2 && <p className="text-xs text-[#576177]">{addr.line2}</p>}
                  {addr.landmark && (
                    <p className="text-[11px] text-[#576177] italic mt-0.5">Landmark: {addr.landmark}</p>
                  )}
                  <span className="text-[11px] text-[#576177] font-mono mt-1 block">
                    Pincode: {addr.pincode}
                  </span>
                </div>

                <button
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="text-[#576177] hover:text-[#A32234] text-xs p-1"
                  title="Delete address"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Payment Methods (Masked Only) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-3">
          <h2 className="text-base font-bold text-[#111D35]">Saved Payment Methods</h2>
          <p className="text-xs text-[#576177]">
            Masked labels only. CVVs, full card numbers, and UPI PINs are never stored.
          </p>

          <div className="flex flex-col gap-2">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="p-3 bg-[#FFF9FC] rounded-2xl border border-[#F0D7E2]/60 flex items-center justify-between text-xs text-[#111D35]"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#C40054]">
                    {pm.type === 'upi' ? 'qr_code_2' : pm.type === 'card' ? 'credit_card' : 'account_balance'}
                  </span>
                  <span className="font-semibold">{pm.masked_label}</span>
                </div>
                <span className="text-[10px] font-bold text-[#125F43] bg-[#E5F6ED] px-2 py-0.5 rounded-full border border-[#16845A]/20">
                  Sandbox Linked
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="pt-2 text-center">
          <button
            onClick={onSignOut}
            className="py-2.5 px-6 rounded-full border border-[#F0D7E2] hover:bg-[#FFE7E9] text-xs font-bold text-[#A32234] transition-colors cursor-pointer"
          >
            Sign Out of Ownly
          </button>
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleAddAddress}
            className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-[#F0D7E2] flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#F0D7E2]">
              <h3 className="text-base font-bold text-[#111D35]">Add Chennai Address</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-[#FFF9FC] flex items-center justify-center text-[#111D35] border border-[#F0D7E2]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-[#111D35] block mb-1">Address Label</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Home', 'Office', "Friend's place", 'Other'] as const).map((l) => (
                  <button
                    type="button"
                    key={l}
                    onClick={() => setLabel(l)}
                    className={`p-2 rounded-xl text-center text-xs font-semibold transition-all border ${
                      label === l
                        ? 'bg-[#C40054] text-white border-[#C40054]'
                        : 'bg-[#FFF9FC] text-[#111D35] border-[#F0D7E2]'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#111D35] block mb-1">Flat / Building / Line 1</label>
              <input
                type="text"
                required
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                placeholder="e.g. Building 4A, 3rd Floor"
                className="w-full h-10 px-3 bg-[#FFF9FC] border border-[#F0D7E2] rounded-xl text-xs font-medium text-[#111D35] focus:outline-none focus:border-[#C40054]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#111D35] block mb-1">Street / Line 2</label>
              <input
                type="text"
                value={line2}
                onChange={(e) => setLine2(e.target.value)}
                placeholder="e.g. CSIR Road, Taramani"
                className="w-full h-10 px-3 bg-[#FFF9FC] border border-[#F0D7E2] rounded-xl text-xs font-medium text-[#111D35] focus:outline-none focus:border-[#C40054]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-[#111D35] block mb-1">Area (Chennai)</label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full h-10 px-3 bg-[#FFF9FC] border border-[#F0D7E2] rounded-xl text-xs font-medium text-[#111D35] focus:outline-none focus:border-[#C40054]"
                >
                  <option value="T. Nagar">T. Nagar</option>
                  <option value="Adyar">Adyar</option>
                  <option value="Velachery">Velachery</option>
                  <option value="OMR">OMR</option>
                  <option value="Anna Nagar">Anna Nagar</option>
                  <option value="Nungambakkam">Nungambakkam</option>
                  <option value="Mylapore">Mylapore</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#111D35] block mb-1">Pincode</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="600113"
                  className="w-full h-10 px-3 bg-[#FFF9FC] border border-[#F0D7E2] rounded-xl text-xs font-mono font-medium text-[#111D35] focus:outline-none focus:border-[#C40054]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#111D35] block mb-1">Landmark (optional)</label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Tidel Park"
                className="w-full h-10 px-3 bg-[#FFF9FC] border border-[#F0D7E2] rounded-xl text-xs font-medium text-[#111D35] focus:outline-none focus:border-[#C40054]"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-[#111D35] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 accent-[#C40054]"
              />
              <span>Set as default Chennai address</span>
            </label>

            <button
              type="submit"
              className="w-full h-11 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 font-bold text-xs text-white shadow-xs mt-2 cursor-pointer"
            >
              Save Address
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
