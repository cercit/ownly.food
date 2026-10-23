import React, { useState, useEffect } from 'react';
import {
  getGroup,
  shareLink,
  calculateShares,
  currentUser,
  GroupOrder
} from '../services/ownly-api.ts';

interface OrderConfirmationScreenProps {
  groupId: string;
  onGoToPayMyShare: (groupId: string) => void;
  onGoToTracking: (groupId: string) => void;
  onGoToExplore: () => void;
}

export const OrderConfirmationScreen: React.FC<OrderConfirmationScreenProps> = ({
  groupId,
  onGoToPayMyShare,
  onGoToTracking,
  onGoToExplore
}) => {
  const [group, setGroup] = useState<GroupOrder | null>(null);
  const [copied, setCopied] = useState(false);

  const user = currentUser();

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    try {
      const g = await getGroup(groupId);
      setGroup(g);
    } catch (err) {
      console.error(err);
    }
  };

  if (!group) {
    return <div className="py-20 text-center text-sm text-[#576177]">Loading confirmation...</div>;
  }

  const shares = calculateShares(group);
  const link = shareLink(group.share_code);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Order placed from ${group.restaurant_name}! Here is your share breakdown and live tracking link: ${link} (Code: ${group.share_code})`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col gap-6">
        {/* Celebration Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#E5F6ED] text-[#125F43] flex items-center justify-center mb-3 border border-[#16845A]/20">
            <span className="material-symbols-outlined text-[36px]">done_all</span>
          </div>

          <span className="text-xs font-bold text-[#125F43] uppercase tracking-wider bg-[#E5F6ED] px-3 py-1 rounded-full mb-1 border border-[#16845A]/20">
            Order Transmitted to Kitchen & Rapido
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111D35]">
            Order #{group.share_code} Confirmed!
          </h1>

          <p className="text-xs sm:text-sm text-[#576177] mt-1 max-w-md">
            {group.restaurant_name} is preparing your squad's order for delivery to{' '}
            {group.delivery_address.label} ({group.delivery_address.area}, Chennai).
          </p>
        </div>

        {/* Share Link Front and Centre (Requirement 8) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-3">
          <span className="text-xs font-bold text-[#111D35] uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#C40054]">share</span>
            <span>Squad Share & Tracking Link</span>
          </span>
          <p className="text-xs text-[#576177]">
            Send this link to everyone in the order so they can see their share, pay, and track the rider.
          </p>

          <div className="bg-[#FFF1F6] border border-[#F0D7E2] rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-sm font-black font-mono text-[#C40054] bg-white border border-[#F0D7E2] px-2.5 py-1 rounded-xl shrink-0">
                {group.share_code}
              </span>
              <span className="text-xs font-mono text-[#111D35] truncate select-all">
                {link}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 sm:flex-none py-2 px-3.5 rounded-full bg-white border border-[#F0D7E2] hover:bg-[#FFE3ED] text-xs font-bold text-[#C40054] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'done' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied' : 'Copy link'}</span>
              </button>

              <button
                onClick={handleWhatsAppShare}
                className="flex-1 sm:flex-none py-2 px-3.5 rounded-full bg-[#E5F6ED] hover:bg-[#D3F3DE] text-[#125F43] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#16845A]/20"
              >
                <span className="material-symbols-outlined text-[16px]">share</span>
                <span>Share on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Member Breakdown & Settlement Roster */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-[#111D35]">Who Ordered What & Exact Shares</h3>
              <p className="text-xs text-[#576177]">
                Split rule: {group.split_rule === 'itemised' ? 'Pay for what you ordered' : 'Split everything equally'}
              </p>
            </div>
            <span className="text-xs font-bold text-[#125F43] bg-[#E5F6ED] px-2.5 py-1 rounded-full border border-[#16845A]/20">
              {group.members.filter((m) => m.payment_status === 'paid').length} of {group.members.length} Settled
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {shares.map((share) => {
              const isPaid = share.payment_status === 'paid';
              const isMe = share.user_id === user?.id || share.user_email === user?.email;

              return (
                <div
                  key={share.user_id}
                  className={`p-4 rounded-2xl border flex flex-col gap-2.5 transition-all ${
                    isPaid ? 'bg-[#FFF9FC] border-[#F0D7E2]' : 'bg-[#FFF1F6] border-[#F0D7E2]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#111D35] text-white font-black text-xs flex items-center justify-center border border-[#F0D7E2]">
                        {share.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-sm text-[#111D35]">
                            {share.user_name} {isMe && '(You)'}
                          </span>
                          {share.is_host && (
                            <span className="text-[9px] bg-[#FFE3ED] text-[#C40054] font-extrabold px-1.5 py-0.2 rounded uppercase">
                              Host
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono text-[#111D35]">
                        ₹{share.total_payable.toFixed(2)}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                          isPaid
                            ? 'bg-[#E5F6ED] text-[#125F43] border border-[#16845A]/20'
                            : 'bg-[#FFF1D9] text-[#855000] border border-[#A65D00]/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {isPaid ? 'check_circle' : 'schedule'}
                        </span>
                        <span>{isPaid ? 'Paid' : 'Pending'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Itemized list of this user's dishes */}
                  <div className="pl-9 text-xs text-[#576177]">
                    {share.items.length === 0 ? (
                      <span className="italic">No personal dishes (contributing to shared items + charges)</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {share.items.map((it) => (
                          <span key={it.id} className="bg-white border border-[#F0D7E2] px-2 py-0.5 rounded-md text-[11px] text-[#111D35]">
                            {it.quantity}× {it.item_name}
                            {it.notes ? ` ("${it.notes}")` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => onGoToPayMyShare(groupId)}
            className="h-13 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white font-bold text-sm shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">payments</span>
            <span>Pay My Share</span>
          </button>

          <button
            onClick={() => onGoToTracking(groupId)}
            className="h-13 rounded-full bg-[#111D35] hover:bg-black text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">moped</span>
            <span>Track Order Live</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={onGoToExplore}
            className="text-xs text-[#576177] hover:text-[#C40054] font-semibold underline"
          >
            Back to Explore Chennai Kitchens
          </button>
        </div>
      </div>
    </div>
  );
};
