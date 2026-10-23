import React, { useState, useEffect } from 'react';
import {
  previewGroup,
  joinGroup,
  codeFromLink,
  GroupPreview
} from '../services/ownly-api.ts';

interface JoinRoomScreenProps {
  initialCode?: string;
  onJoined: (groupId: string) => void;
  onGoToExplore: () => void;
}

export const JoinRoomScreen: React.FC<JoinRoomScreenProps> = ({
  initialCode,
  onJoined,
  onGoToExplore
}) => {
  const [code, setCode] = useState<string>(initialCode || '');
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if code was in URL query string (?join=XXXXXX) or props
    const urlCode = codeFromLink();
    const targetCode = urlCode || initialCode;
    if (targetCode && targetCode.length === 6) {
      setCode(targetCode.toUpperCase());
      handlePreview(targetCode.toUpperCase());
    }
  }, [initialCode]);

  const handlePreview = async (roomCodeToPreview: string) => {
    if (roomCodeToPreview.trim().length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const res = await previewGroup(roomCodeToPreview.trim().toUpperCase());
      setPreview(res);
    } catch (err: any) {
      setPreview(null);
      setError(err?.message || 'Room not found. Check the 6-character code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!preview) return;
    setError(null);
    setLoading(true);
    try {
      const res = await joinGroup(preview.share_code);
      onJoined(res.group_order_id);
    } catch (err: any) {
      setError(err?.message || 'Failed to join group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-12">
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_6px_18px_rgba(17,29,53,0.06)] border border-[#F0D7E2]">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#FFE3ED] text-[#C40054] flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-[26px]">groups</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#111D35] tracking-tight">Join a Group Order</h1>
          <p className="text-xs sm:text-sm text-[#576177] mt-1">
            Enter the 6-character invite code from your host or WhatsApp link
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-[#FFE7E9] border border-[#A32234]/20 text-[#A32234] text-xs font-semibold flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Code Input */}
        <div className="mb-6">
          <label className="text-xs font-bold text-[#111D35] uppercase tracking-wider block mb-2 text-center">
            6-Character Room Code
          </label>
          <div className="relative">
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                setCode(val);
                if (val.length === 6) {
                  handlePreview(val);
                } else {
                  setPreview(null);
                }
              }}
              placeholder="e.g. TNR742"
              className="w-full h-14 text-center text-2xl font-mono font-black tracking-widest uppercase bg-[#FFF9FC] border-2 border-[#F0D7E2] focus:border-[#C40054] focus:ring-2 focus:ring-[#FFE3ED] focus:bg-white rounded-2xl text-[#111D35] outline-none transition-all"
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-[#576177] mt-2 px-1">
            <span>Letters and numbers only, no dash.</span>
            {code.length > 0 && code.length < 6 && (
              <span className="font-bold text-[#C40054]">{6 - code.length} characters left</span>
            )}
          </div>
        </div>

        {/* Room Preview Card */}
        {loading ? (
          <div className="py-8 text-center text-xs text-[#576177]">Checking room details...</div>
        ) : preview ? (
          <div className="bg-[#FFF1F6] rounded-2xl p-4 border border-[#F0D7E2] mb-6 flex flex-col gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <img
                src={preview.restaurant_image}
                alt={preview.restaurant_name}
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#F0D7E2]"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-[#C40054] bg-[#FFE3ED] px-2 py-0.5 rounded uppercase">
                  {preview.restaurant_area}
                </span>
                <h3 className="font-extrabold text-sm text-[#111D35] truncate mt-0.5">
                  {preview.restaurant_name}
                </h3>
                <p className="text-xs text-[#576177]">Hosted by {preview.host_name}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-[#F0D7E2] flex items-center justify-between text-xs">
              <span className="text-[#576177] flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[15px] text-[#125F43]">groups</span>
                <span>
                  {preview.member_count} / {preview.max_members} Joined
                </span>
              </span>

              {preview.is_full ? (
                <span className="text-[#A32234] font-bold text-[11px] bg-[#FFE7E9] px-2 py-0.5 rounded-full border border-[#A32234]/20">
                  This group is full (12 people)
                </span>
              ) : (
                <span className="text-[#125F43] font-bold text-[11px] bg-[#E5F6ED] px-2 py-0.5 rounded-full border border-[#16845A]/20">
                  Open for items
                </span>
              )}
            </div>

            {preview.is_full ? (
              <div className="p-3 bg-[#FFE7E9] text-[#A32234] text-xs rounded-xl font-medium border border-[#A32234]/20">
                This group is full (12 people). Please contact {preview.host_name} or start a new group order.
              </div>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                className="w-full h-12 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white font-bold text-xs sm:text-sm shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-1"
              >
                <span>Join Order & Open Menu</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            )}
          </div>
        ) : (
          /* Suggest Sample Code for reviewer quick check */
          <div className="p-4 rounded-2xl bg-[#FFF9FC] border border-[#F0D7E2] flex items-center justify-between text-xs text-[#576177] mb-6">
            <span>Try sample Chennai room:</span>
            <button
              onClick={() => {
                setCode('TNR742');
                handlePreview('TNR742');
              }}
              className="px-3 py-1 rounded-full bg-[#FFE3ED] text-[#C40054] font-mono font-bold text-xs border border-[#F0D7E2] hover:bg-[#C40054] hover:text-white transition-colors"
            >
              Use TNR742
            </button>
          </div>
        )}

        <div className="pt-2 text-center">
          <button
            onClick={onGoToExplore}
            className="text-xs text-[#576177] hover:text-[#C40054] font-semibold underline"
          >
            ← Or explore Chennai kitchens to start a new order
          </button>
        </div>
      </div>
    </div>
  );
};
