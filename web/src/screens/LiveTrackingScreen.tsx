import React, { useState, useEffect } from 'react';
import { getGroup, TrackingStage, GroupOrder, shareLink } from '../services/ownly-api.ts';

interface LiveTrackingScreenProps {
  groupId: string;
  onBackToCart: (groupId: string) => void;
}

const STAGES: TrackingStage[] = [
  'Order accepted',
  'Preparing',
  'Picked up',
  'On the way',
  'Delivered'
];

export const LiveTrackingScreen: React.FC<LiveTrackingScreenProps> = ({
  groupId,
  onBackToCart
}) => {
  const [group, setGroup] = useState<GroupOrder | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(1); // default 'Preparing'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  // Automated prototype timer progression
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStageIndex((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  const loadGroup = async () => {
    try {
      const g = await getGroup(groupId);
      setGroup(g);
      const idx = STAGES.indexOf(g.tracking_stage);
      if (idx >= 0) setCurrentStageIndex(idx);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextStage = () => {
    setCurrentStageIndex((prev) => (prev < STAGES.length - 1 ? prev + 1 : 0));
  };

  if (!group) {
    return <div className="py-20 text-center text-sm text-[#576177]">Loading tracking...</div>;
  }

  const currentStage = STAGES[currentStageIndex];
  const link = shareLink(group.share_code);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col gap-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onBackToCart(groupId)}
            className="text-xs font-bold text-[#576177] hover:text-[#C40054] flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Room #{group.share_code}</span>
          </button>

          {/* Prototype Simulator Controls for Reviewer */}
          <button
            onClick={handleNextStage}
            className="px-3.5 py-1.5 rounded-full bg-[#FFF1F6] hover:bg-[#FFE3ED] border border-[#F0D7E2] text-xs font-bold text-[#C40054] flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-[15px] text-[#C40054]">fast_forward</span>
            <span>Advance Stage (Demo)</span>
          </button>
        </div>

        {/* Primary Hero Status Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#125F43] bg-[#E5F6ED] px-2.5 py-0.5 rounded-full inline-block mb-1 border border-[#16845A]/20">
                Rapido Delivery Active
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#111D35]">
                {currentStage === 'Delivered'
                  ? 'Your food has arrived!'
                  : 'Your Rapido Captain is on the way'}
              </h1>
              <p className="text-xs text-[#576177] mt-0.5">
                From {group.restaurant_name} ({group.restaurant_area}) to {group.delivery_address.label} ({group.delivery_address.area}, Chennai)
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-[#FFE3ED] text-[#C40054] flex items-center justify-center shrink-0 border border-[#F0D7E2]">
              <span className="material-symbols-outlined text-[28px]">
                {currentStage === 'Delivered' ? 'home' : 'moped'}
              </span>
            </div>
          </div>

          {/* 5-Stage Stepper (Requirement 9) */}
          <div className="py-2">
            <div className="grid grid-cols-5 gap-1 relative">
              {STAGES.map((stageName, idx) => {
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;

                return (
                  <div key={stageName} className="flex flex-col items-center text-center gap-1.5">
                    {/* Circle Indicator */}
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        isCurrent
                          ? 'bg-[#C40054] text-white ring-4 ring-[#FFE3ED]'
                          : isPassed
                          ? 'bg-[#16845A] text-white'
                          : 'bg-[#FFF9FC] text-[#576177] border border-[#F0D7E2]'
                      }`}
                    >
                      {isPassed ? (
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] sm:text-xs leading-tight line-clamp-2 ${
                        isCurrent
                          ? 'font-extrabold text-[#C40054]'
                          : isPassed
                          ? 'font-bold text-[#16845A]'
                          : 'text-[#576177]'
                      }`}
                    >
                      {stageName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chennai Simulated Map Card */}
        <div className="bg-white rounded-3xl overflow-hidden border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col">
          <div className="relative h-56 w-full bg-[#FFF1F6] overflow-hidden">
            {/* Vector Map Canvas */}
            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none" fill="none">
              <rect width="400" height="200" fill="#FFF8FB" />
              {/* Chennai Arterial Roads: OMR, Sardar Patel Road, Anna Salai */}
              <path d="M-10 60 Q 120 70 200 100 T 410 90" stroke="#F6DCE6" strokeWidth="14" strokeLinecap="round" />
              <path d="M70 210 L 140 130 L 250 120 L 350 30" stroke="#F6DCE6" strokeWidth="10" strokeLinecap="round" />
              <path d="M140 130 Q 220 160 410 160" stroke="#F6DCE6" strokeWidth="8" strokeLinecap="round" />
              {/* Coastline visual hint for Chennai Bay of Bengal */}
              <path d="M 380 -10 Q 370 100 390 210" stroke="#E2C1D2" strokeWidth="16" />

              {/* Active Delivery Route */}
              <path
                d="M 50 65 C 120 85, 170 140, 270 110 S 340 45, 360 50"
                stroke="#F50062"
                strokeWidth="5"
                strokeDasharray="6 4"
                strokeLinecap="round"
              />

              {/* Kitchen Pin (Chennai Restaurant) */}
              <circle cx="50" cy="65" r="10" fill="#C40054" />
              <circle cx="50" cy="65" r="4" fill="#FFFFFF" />

              {/* Animated Rider Position */}
              <g className="animate-pulse">
                <circle cx="210" cy="115" r="16" fill="#F50062" fillOpacity="0.25" />
                <circle cx="210" cy="115" r="9" fill="#111D35" />
                <circle cx="210" cy="115" r="4" fill="#FFFFFF" />
              </g>

              {/* Destination Pin (Chennai Office/Home) */}
              <circle cx="360" cy="50" r="11" fill="#16845A" />
              <circle cx="360" cy="50" r="5" fill="#FFFFFF" />
            </svg>

            {/* Floating Info Chips */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
              <div className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-xs flex items-center gap-1.5 text-xs text-[#111D35] border border-[#F0D7E2]">
                <span className="w-2 h-2 rounded-full bg-[#C40054]"></span>
                <span className="font-bold truncate">{group.restaurant_name}</span>
              </div>

              <div className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md shadow-xs flex items-center gap-1.5 text-xs text-[#111D35] border border-[#F0D7E2]">
                <span className="w-2 h-2 rounded-full bg-[#16845A]"></span>
                <span className="font-bold truncate">{group.delivery_address.area}</span>
              </div>
            </div>

            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-xs flex items-center gap-2 border border-[#F0D7E2]">
              <span className="material-symbols-outlined text-[16px] text-[#C40054]">navigation</span>
              <span className="text-xs font-bold text-[#111D35]">
                Rapido Courier en route • Estimated 18-24 mins
              </span>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3.5 bg-[#FFF9FC] flex items-center gap-2 text-xs text-[#576177]">
            <span className="material-symbols-outlined text-[18px] text-[#16845A] shrink-0">verified_user</span>
            <span>
              <strong>Privacy Guard:</strong> Exact floor & desk details are only unlocked to your Rapido Captain upon arrival at the building gate.
            </span>
          </div>
        </div>

        {/* Live Squad Link Bar */}
        <div className="bg-white rounded-3xl p-5 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-[#111D35] block">
              Anyone in the squad can track from this link:
            </span>
            <span className="text-xs text-[#576177] font-mono">{link}</span>
          </div>

          <button
            onClick={handleCopyLink}
            className="py-2 px-4 rounded-full bg-[#FFF1F6] hover:bg-[#FFE3ED] border border-[#F0D7E2] text-xs font-bold text-[#C40054] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copied ? 'done' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied Tracking Link' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
