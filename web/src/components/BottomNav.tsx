import React from 'react';
import { GroupOrder } from '../services/ownly-api.ts';

interface BottomNavProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  activeGroup: GroupOrder | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  activeGroup
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#F0D7E2] shadow-[0_-2px_14px_rgba(17,29,53,0.06)] lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        <button
          onClick={() => onNavigate('explore')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
            currentScreen === 'explore' ? 'text-[#C40054] font-bold' : 'text-[#576177]'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">storefront</span>
          <span className="text-[10px] mt-0.5">Explore</span>
        </button>

        <button
          onClick={() => (activeGroup ? onNavigate('shared-cart') : onNavigate('start-group'))}
          className={`relative flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
            currentScreen === 'shared-cart' || currentScreen === 'start-group'
              ? 'text-[#C40054] font-bold'
              : 'text-[#576177]'
          }`}
        >
          <div className="relative">
            <span className="material-symbols-outlined text-[24px]">group_add</span>
            {activeGroup && (
              <span className="absolute -top-1 -right-2 bg-[#F50062] text-white text-[8px] font-extrabold px-1 rounded-full leading-tight">
                LIVE
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">{activeGroup ? 'Cart' : 'Start'}</span>
        </button>

        <button
          onClick={() => onNavigate('join-room')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
            currentScreen === 'join-room' ? 'text-[#C40054] font-bold' : 'text-[#576177]'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">pin</span>
          <span className="text-[10px] mt-0.5">Join</span>
        </button>

        <button
          onClick={() => onNavigate('history')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
            currentScreen === 'history' ? 'text-[#C40054] font-bold' : 'text-[#576177]'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">receipt_long</span>
          <span className="text-[10px] mt-0.5">Orders</span>
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 transition-colors ${
            currentScreen === 'profile' ? 'text-[#C40054] font-bold' : 'text-[#576177]'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">person</span>
          <span className="text-[10px] mt-0.5">Profile</span>
        </button>
      </div>
    </nav>
  );
};
