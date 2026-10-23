import React from 'react';
import { User, GroupOrder } from '../services/ownly-api.ts';

interface HeaderProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  currentUser: User | null;
  activeGroup: GroupOrder | null;
  isMobilePreview: boolean;
  onToggleMobilePreview: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  currentUser,
  activeGroup,
  isMobilePreview,
  onToggleMobilePreview
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#F0D7E2] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
        {/* Left: Brand & City */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('explore')}
            className="flex items-center gap-3 group text-left transition-transform hover:scale-[1.01]"
          >
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-xs border border-[#F0D7E2] flex-shrink-0 bg-[#F50062]">
              <img
                src="/assets/aistudio/owenly_logo_9141f5f9.jpg"
                alt="Ownly Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-[#C40054]">ownly</span>
                <span className="text-xl font-extrabold tracking-tight text-[#111D35]">together</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#576177]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16845A]"></span>
                  Chennai
                </span>
                <span className="text-[10px] font-bold text-[#C40054] bg-[#FFE3ED] px-2 py-0.2 rounded-full">
                  Proposed
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Center: Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-[#FFF9FC] p-1.5 rounded-full border border-[#F0D7E2]">
          <button
            onClick={() => onNavigate('explore')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              currentScreen === 'explore'
                ? 'bg-[#C40054] text-white shadow-xs'
                : 'text-[#576177] hover:text-[#111D35] hover:bg-white'
            }`}
          >
            Explore Restaurants
          </button>
          <button
            onClick={() => onNavigate('start-group')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              currentScreen === 'start-group'
                ? 'bg-[#C40054] text-white shadow-xs'
                : 'text-[#576177] hover:text-[#111D35] hover:bg-white'
            }`}
          >
            Start Group
          </button>
          <button
            onClick={() => onNavigate('join-room')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              currentScreen === 'join-room'
                ? 'bg-[#C40054] text-white shadow-xs'
                : 'text-[#576177] hover:text-[#111D35] hover:bg-white'
            }`}
          >
            Join Room
          </button>
          <button
            onClick={() => onNavigate('history')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              currentScreen === 'history'
                ? 'bg-[#C40054] text-white shadow-xs'
                : 'text-[#576177] hover:text-[#111D35] hover:bg-white'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => onNavigate('profile')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              currentScreen === 'profile'
                ? 'bg-[#C40054] text-white shadow-xs'
                : 'text-[#576177] hover:text-[#111D35] hover:bg-white'
            }`}
          >
            Profile
          </button>
        </nav>

        {/* Right: Active Room Pill, Reviewer Device Switcher, User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {activeGroup && (
            <button
              onClick={() => onNavigate('shared-cart')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFE3ED] text-[#C40054] text-xs font-extrabold border border-[#F0D7E2] hover:bg-[#C40054] hover:text-white transition-all shadow-xs"
              title="Open active group order"
            >
              <span className="w-2 h-2 rounded-full bg-[#F50062] animate-pulse"></span>
              <span className="hidden sm:inline">Room</span>
              <span>{activeGroup.share_code}</span>
            </button>
          )}

          {/* Desktop/Mobile Device Preview Toggle for Reviewer */}
          <button
            onClick={onToggleMobilePreview}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              isMobilePreview
                ? 'bg-[#C40054] text-white border-[#C40054] shadow-xs'
                : 'bg-white text-[#576177] border-[#F0D7E2] hover:text-[#111D35] hover:bg-[#FFF1F6]'
            }`}
            title="Toggle between full-width desktop view and 390px mobile phone frame"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isMobilePreview ? 'smartphone' : 'laptop'}
            </span>
            <span className="hidden md:inline">{isMobilePreview ? 'Mobile Frame' : 'Desktop View'}</span>
          </button>

          {/* User Icon */}
          {currentUser ? (
            <button
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-[#FFF1F6] transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-[#111D35] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-[#F0D7E2]">
                {currentUser.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-[#111D35] hidden sm:inline max-w-[100px] truncate">
                {currentUser.full_name}
              </span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('signin')}
              className="px-4 py-2 rounded-full bg-[#C40054] text-white text-xs font-bold shadow-[0_9px_24px_rgba(196,0,84,0.18)] hover:bg-[#A80047] transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
