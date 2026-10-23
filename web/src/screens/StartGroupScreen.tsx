import React, { useState, useEffect } from 'react';
import {
  startGroupOrder,
  listAddresses,
  listRestaurants,
  shareLink,
  Address,
  Restaurant,
  SplitRule
} from '../services/ownly-api.ts';

interface StartGroupScreenProps {
  initialRestaurantId?: string;
  onRoomCreated: (groupId: string, shareCode: string) => void;
  onOpenCart: (groupId: string) => void;
}

export const StartGroupScreen: React.FC<StartGroupScreenProps> = ({
  initialRestaurantId,
  onRoomCreated,
  onOpenCart
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(
    initialRestaurantId || 'rest_sangeetha'
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [cutOffMinutes, setCutOffMinutes] = useState<number>(30);
  const [splitRule, setSplitRule] = useState<SplitRule>('itemised');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Success state after creation
  const [createdRoom, setCreatedRoom] = useState<{
    id: string;
    code: string;
    link: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [rList, aList] = await Promise.all([listRestaurants(), listAddresses()]);
    setRestaurants(rList);
    setAddresses(aList);
    if (aList.length > 0) {
      const def = aList.find((a) => a.is_default) || aList[0];
      setSelectedAddressId(def.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantId || !selectedAddressId) {
      setError('Please select a restaurant and delivery address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await startGroupOrder(
        selectedRestaurantId,
        selectedAddressId,
        cutOffMinutes,
        splitRule
      );
      const link = shareLink(res.share_code);
      setCreatedRoom({ id: res.id, code: res.share_code, link });
      onRoomCreated(res.id, res.share_code);
    } catch (err: any) {
      setError(err?.message || 'Failed to start group order');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdRoom) return;
    navigator.clipboard?.writeText(createdRoom.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!createdRoom) return;
    const currentRest = restaurants.find((r) => r.id === selectedRestaurantId);
    const text = encodeURIComponent(
      `Hey! Join our Ownly Together food room from ${currentRest?.name || 'Chennai'}. Choose your meal here: ${createdRoom.link} (Code: ${createdRoom.code})`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const selectedRest = restaurants.find((r) => r.id === selectedRestaurantId);
  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12">
      {/* If Room is already created, show the Room Deployment Hub */}
      {createdRoom ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_6px_18px_rgba(17,29,53,0.06)] border border-[#F0D7E2] animate-in fade-in duration-200">
          <div className="flex flex-col items-center text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#E5F6ED] text-[#125F43] flex items-center justify-center mb-3 border border-[#16845A]/20">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#125F43] bg-[#E5F6ED] px-3 py-1 rounded-full mb-1">
              Group Room Live & Ready
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111D35]">
              {selectedRest?.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#576177] mt-1">
              Delivering to {selectedAddr?.label} ({selectedAddr?.area}, Chennai)
            </p>

            {/* 6-Character Room Code Display */}
            <div className="w-full my-6 p-6 rounded-3xl bg-[#FFF1F6] border border-[#F0D7E2] flex flex-col items-center gap-2">
              <span className="text-[11px] font-extrabold text-[#C40054] uppercase tracking-wider">
                6-Character Room Code
              </span>
              <span className="text-4xl sm:text-5xl font-black font-mono text-[#111D35] tracking-widest">
                {createdRoom.code}
              </span>
              <span className="text-xs text-[#125F43] font-bold flex items-center gap-1 mt-1 bg-white px-3 py-1 rounded-full border border-[#16845A]/20">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Host Split Rule: {splitRule === 'itemised' ? 'Pay for what you ordered' : 'Split everything equally'}
              </span>
            </div>

            {/* Share Link Bar */}
            <div className="w-full bg-[#FFF9FC] border border-[#F0D7E2] rounded-2xl p-2.5 flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2 min-w-0 flex-1 pl-2">
                <span className="material-symbols-outlined text-[18px] text-[#C40054]">link</span>
                <span className="text-xs text-[#111D35] truncate font-mono select-all">
                  {createdRoom.link}
                </span>
              </div>
              <button
                onClick={handleCopyLink}
                className="py-2 px-3.5 rounded-full bg-white hover:bg-[#FFE3ED] border border-[#F0D7E2] text-xs font-bold text-[#C40054] transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'done' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied!' : 'Copy link'}</span>
              </button>
            </div>

            {/* Vector SVG QR Code */}
            <div className="p-4 bg-[#FFF9FC] border border-[#F0D7E2] rounded-2xl flex flex-col items-center text-center gap-2 mb-6">
              <svg className="w-32 h-32 text-[#111D35]" viewBox="0 0 100 100" fill="currentColor">
                <rect x="10" y="10" width="24" height="24" rx="2" />
                <rect x="14" y="14" width="16" height="16" fill="#fff" />
                <rect x="18" y="18" width="8" height="8" />
                <rect x="66" y="10" width="24" height="24" rx="2" />
                <rect x="70" y="14" width="16" height="16" fill="#fff" />
                <rect x="74" y="18" width="8" height="8" />
                <rect x="10" y="66" width="24" height="24" rx="2" />
                <rect x="14" y="70" width="16" height="16" fill="#fff" />
                <rect x="18" y="74" width="8" height="8" />
                <rect x="42" y="12" width="6" height="6" />
                <rect x="52" y="18" width="6" height="6" />
                <rect x="42" y="28" width="6" height="6" />
                <rect x="50" y="38" width="6" height="6" />
                <rect x="20" y="44" width="6" height="6" />
                <rect x="30" y="44" width="6" height="6" />
                <rect x="40" y="48" width="8" height="8" />
                <rect x="64" y="42" width="6" height="6" />
                <rect x="76" y="48" width="6" height="6" />
                <rect x="48" y="64" width="6" height="6" />
                <rect x="58" y="72" width="6" height="6" />
                <rect x="70" y="68" width="6" height="6" />
                <rect x="80" y="76" width="6" height="6" />
                <circle cx="50" cy="50" r="7" fill="#F50062" />
              </svg>
              <span className="text-[11px] text-[#576177]">
                Show screen to office squad or flatmates to scan and join instantly
              </span>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={handleShareWhatsApp}
                className="w-full h-12 rounded-full bg-[#E5F6ED] hover:bg-[#D3F3DE] text-[#125F43] font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#16845A]/20"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                <span>Share on WhatsApp Group</span>
              </button>

              <button
                onClick={() => onOpenCart(createdRoom.id)}
                className="w-full h-12 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white font-bold text-sm shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Open Shared Cart & Add Your Dishes</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Configuration Form */
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111D35] tracking-tight">
              Start a Group Order
            </h1>
            <p className="text-xs sm:text-sm text-[#576177] mt-1">
              You are the Host. Pick the restaurant, set the cut-off timer and choose how the bill is split.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#FFE7E9] text-[#A32234] text-xs font-semibold flex items-center gap-2 border border-[#A32234]/20">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* 1. Restaurant Picker */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-3">
            <label className="text-xs font-bold text-[#111D35] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#FFE3ED] text-[#C40054] flex items-center justify-center font-extrabold text-[11px]">
                1
              </span>
              <span>Choose Restaurant</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {restaurants.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRestaurantId(r.id)}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                    selectedRestaurantId === r.id
                      ? 'border-[#C40054] bg-[#FFE3ED]/30 shadow-xs ring-1 ring-[#C40054]'
                      : 'border-[#F0D7E2] bg-white hover:border-[#C40054]/50'
                  }`}
                >
                  <img
                    src={r.image_url}
                    alt={r.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-[#111D35] truncate">{r.name}</h4>
                    <p className="text-xs text-[#576177] truncate">{r.area} • {r.cuisine}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Delivery Address Selector */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-3">
            <label className="text-xs font-bold text-[#111D35] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#FFE3ED] text-[#C40054] flex items-center justify-center font-extrabold text-[11px]">
                2
              </span>
              <span>Delivery Address (Chennai)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all ${
                    selectedAddressId === addr.id
                      ? 'border-[#C40054] bg-[#FFE3ED]/30 shadow-xs ring-1 ring-[#C40054]'
                      : 'border-[#F0D7E2] bg-white hover:border-[#C40054]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[#111D35]">{addr.label}</span>
                      <span className="text-[10px] font-semibold text-[#576177]">{addr.area}</span>
                    </div>
                    <p className="text-xs text-[#576177] line-clamp-2">{addr.line1}</p>
                  </div>
                  <span className="text-[10px] text-[#576177] font-mono mt-2 block">PIN: {addr.pincode}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Cut-Off Window */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-3">
            <label className="text-xs font-bold text-[#111D35] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#FFE3ED] text-[#C40054] flex items-center justify-center font-extrabold text-[11px]">
                3
              </span>
              <span>Order Cut-Off Window</span>
            </label>
            <p className="text-xs text-[#576177]">
              The host locks the cart. Members cannot join after the cut-off.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '15 Mins', val: 15, desc: 'Quick' },
                { label: '30 Mins', val: 30, desc: 'Recommended' },
                { label: '45 Mins', val: 45, desc: 'Relaxed' }
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.val}
                  onClick={() => setCutOffMinutes(opt.val)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    cutOffMinutes === opt.val
                      ? 'border-[#C40054] bg-[#C40054] text-white shadow-xs'
                      : 'border-[#F0D7E2] bg-[#FFF9FC] text-[#111D35] hover:bg-white'
                  }`}
                >
                  <div className="text-sm font-bold">{opt.label}</div>
                  <div className={`text-[10px] mt-0.5 ${cutOffMinutes === opt.val ? 'text-white/80' : 'text-[#576177]'}`}>
                    {opt.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Host Split Rule (The Core Rule Decision) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-3">
            <label className="text-xs font-bold text-[#111D35] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#FFE3ED] text-[#C40054] flex items-center justify-center font-extrabold text-[11px]">
                4
              </span>
              <span>Bill Splitting Rule</span>
            </label>

            <div className="flex flex-col gap-3">
              {/* Option a: Pay for what you ordered */}
              <div
                onClick={() => setSplitRule('itemised')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  splitRule === 'itemised'
                    ? 'border-[#C40054] bg-[#FFE3ED]/30 shadow-xs'
                    : 'border-[#F0D7E2] bg-white hover:border-[#C40054]/50'
                }`}
              >
                <div className="pt-0.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      splitRule === 'itemised' ? 'border-[#C40054] bg-[#C40054]' : 'border-[#F0D7E2]'
                    }`}
                  >
                    {splitRule === 'itemised' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#111D35]">Pay for what you ordered</h4>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#E5F6ED] text-[#125F43]">
                      Default
                    </span>
                  </div>
                  <p className="text-xs text-[#576177] mt-1 leading-relaxed">
                    Each person pays for their own dishes at full price, plus an equal share of any dish marked{' '}
                    <strong>Shared</strong>, plus an equal share of Rapido's delivery, packaging & taxes.
                  </p>
                </div>
              </div>

              {/* Option b: Split everything equally */}
              <div
                onClick={() => setSplitRule('equal')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  splitRule === 'equal'
                    ? 'border-[#C40054] bg-[#FFE3ED]/30 shadow-xs'
                    : 'border-[#F0D7E2] bg-white hover:border-[#C40054]/50'
                }`}
              >
                <div className="pt-0.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      splitRule === 'equal' ? 'border-[#C40054] bg-[#C40054]' : 'border-[#F0D7E2]'
                    }`}
                  >
                    {splitRule === 'equal' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#111D35]">Split everything equally</h4>
                  <p className="text-xs text-[#576177] mt-1 leading-relaxed">
                    The whole bill (all food plus Rapido charges) is divided equally by the number of active people.
                    Any leftover remainder paisa is allocated to the host.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Group Size Notice */}
          <div className="p-3 bg-[#FFF1F6] rounded-2xl border border-[#F0D7E2] flex items-center gap-2 text-xs text-[#576177]">
            <span className="material-symbols-outlined text-[18px] text-[#C40054]">groups</span>
            <span>Up to 12 people per group order (host included). No minimum or maximum order value.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white font-bold text-sm shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <span>Creating Room...</span>
            ) : (
              <>
                <span>Generate Room & Invite Code</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
