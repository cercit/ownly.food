import React, { useState, useEffect } from 'react';
import {
  currentUser,
  onAuthChange,
  codeFromLink,
  getGroup,
  signOut,
  User,
  GroupOrder
} from './services/ownly-api.ts';
import { ConceptStrip } from './components/ConceptStrip.tsx';
import { Header } from './components/Header.tsx';
import { BottomNav } from './components/BottomNav.tsx';

// All 11 Screen Components
import { SignInScreen } from './screens/SignInScreen.tsx';
import { ExploreScreen } from './screens/ExploreScreen.tsx';
import { StartGroupScreen } from './screens/StartGroupScreen.tsx';
import { JoinRoomScreen } from './screens/JoinRoomScreen.tsx';
import { SharedCartScreen } from './screens/SharedCartScreen.tsx';
import { HostCheckoutScreen } from './screens/HostCheckoutScreen.tsx';
import { OrderConfirmationScreen } from './screens/OrderConfirmationScreen.tsx';
import { MySharePaymentScreen } from './screens/MySharePaymentScreen.tsx';
import { LiveTrackingScreen } from './screens/LiveTrackingScreen.tsx';
import { OrderHistoryScreen } from './screens/OrderHistoryScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';

export default function App() {
  const [user, setUser] = useState<User | null>(currentUser());
  const [currentScreen, setCurrentScreen] = useState<string>('explore');
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [activeGroup, setActiveGroup] = useState<GroupOrder | null>(null);
  const [startRestaurantId, setStartRestaurantId] = useState<string | undefined>(undefined);
  const [joinCodeFromUrl, setJoinCodeFromUrl] = useState<string | undefined>(undefined);
  const [isMobilePreview, setIsMobilePreview] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  // Initialize and subscribe to auth changes
  useEffect(() => {
    const unsub = onAuthChange((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Ensure initial active demo group exists for quick exploration
  useEffect(() => {
    // Check if ?join=XXXXXX parameter was provided in the URL
    const urlCode = codeFromLink();
    if (urlCode) {
      setJoinCodeFromUrl(urlCode);
      setCurrentScreen('join-room');
    }
  }, []);

  // Refresh active group when ID changes or periodically
  useEffect(() => {
    if (!activeGroupId) return;
    getGroup(activeGroupId)
      .then((g) => setActiveGroup(g))
      .catch(() => setActiveGroup(null));
  }, [activeGroupId, currentScreen]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Auth flow callbacks
  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    showToast(`Signed in as ${authenticatedUser.full_name}`);
    if (joinCodeFromUrl) {
      setCurrentScreen('join-room');
    } else {
      setCurrentScreen('explore');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setCurrentScreen('signin');
    showToast('Signed out successfully');
  };

  // Navigation handlers
  const handleStartGroupOrder = (restaurantId: string) => {
    setStartRestaurantId(restaurantId);
    setCurrentScreen('start-group');
  };

  const handleRoomCreated = (groupId: string, shareCode: string) => {
    setActiveGroupId(groupId);
    getGroup(groupId).then((g) => setActiveGroup(g));
    setCurrentScreen('shared-cart');
    showToast(`Room ${shareCode} created! Share the link with friends.`);
  };

  const handleJoined = (groupId: string) => {
    setActiveGroupId(groupId);
    getGroup(groupId).then((g) => setActiveGroup(g));
    setCurrentScreen('shared-cart');
    showToast('Joined group order! Add your favorite dishes.');
  };

  const handleOpenCart = (groupId: string) => {
    setActiveGroupId(groupId);
    setCurrentScreen('shared-cart');
  };

  const handleProceedToCheckout = (groupId: string) => {
    setActiveGroupId(groupId);
    setCurrentScreen('host-checkout');
  };

  const handleOrderPlaced = (groupId: string) => {
    setActiveGroupId(groupId);
    setCurrentScreen('order-confirmation');
  };

  const handleGoToPayMyShare = (groupId: string) => {
    setActiveGroupId(groupId);
    setCurrentScreen('my-share');
  };

  const handleGoToTracking = (groupId: string) => {
    setActiveGroupId(groupId);
    setCurrentScreen('tracking');
  };

  const handleOrderCancelled = () => {
    showToast('Order was cancelled by the host.');
    setCurrentScreen('explore');
  };

  const handleReorderWithGroup = (restaurantName: string, memberNames: string[]) => {
    showToast(`Starting reorder from ${restaurantName} with ${memberNames.slice(0, 2).join(', ')}...`);
    setCurrentScreen('explore');
  };

  // Render the current active screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'signin':
        return <SignInScreen onSuccess={handleAuthSuccess} />;

      case 'explore':
        return (
          <ExploreScreen
            onStartGroupOrder={handleStartGroupOrder}
            onJoinRoom={() => setCurrentScreen('join-room')}
          />
        );

      case 'start-group':
        return (
          <StartGroupScreen
            initialRestaurantId={startRestaurantId}
            onRoomCreated={handleRoomCreated}
            onOpenCart={handleOpenCart}
          />
        );

      case 'join-room':
        return (
          <JoinRoomScreen
            initialCode={joinCodeFromUrl}
            onJoined={handleJoined}
            onGoToExplore={() => setCurrentScreen('explore')}
          />
        );

      case 'shared-cart':
        return (
          <SharedCartScreen
            groupId={activeGroupId}
            onProceedToCheckout={handleProceedToCheckout}
            onGoToPayMyShare={handleGoToPayMyShare}
            onGoToTracking={handleGoToTracking}
            onOrderCancelled={handleOrderCancelled}
          />
        );

      case 'host-checkout':
        return (
          <HostCheckoutScreen
            groupId={activeGroupId}
            onOrderPlaced={handleOrderPlaced}
            onCancel={() => setCurrentScreen('shared-cart')}
          />
        );

      case 'order-confirmation':
        return (
          <OrderConfirmationScreen
            groupId={activeGroupId}
            onGoToPayMyShare={handleGoToPayMyShare}
            onGoToTracking={handleGoToTracking}
            onGoToExplore={() => setCurrentScreen('explore')}
          />
        );

      case 'my-share':
        return (
          <MySharePaymentScreen
            groupId={activeGroupId}
            onGoToTracking={handleGoToTracking}
            onBackToCart={handleOpenCart}
          />
        );

      case 'tracking':
        return (
          <LiveTrackingScreen
            groupId={activeGroupId}
            onBackToCart={handleOpenCart}
          />
        );

      case 'history':
        return (
          <OrderHistoryScreen
            onReorderWithGroup={handleReorderWithGroup}
            onGoToExplore={() => setCurrentScreen('explore')}
          />
        );

      case 'profile':
        return <ProfileScreen onSignOut={handleSignOut} />;

      default:
        return (
          <ExploreScreen
            onStartGroupOrder={handleStartGroupOrder}
            onJoinRoom={() => setCurrentScreen('join-room')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9FC] text-[#111D35] flex flex-col font-['Inter',sans-serif]">
      {/* 1. Universal Thin Strip: Concept prototype by Sameer Mittimani */}
      <ConceptStrip />

      {/* Reviewer Notice Bar for quick context */}
      <div className="bg-[#FFF1F6] border-b border-[#F0D7E2] px-3 py-1.5 text-center text-xs text-[#576177] flex items-center justify-center gap-2 flex-wrap">
        <span className="font-extrabold text-[#C40054] flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#F50062] animate-pulse"></span>
          Ownly Together — Chennai Concept
        </span>
        <span className="hidden sm:inline">•</span>
        <span>Group food ordering with transparent Rapido split charges</span>
        <span className="hidden md:inline">•</span>
        <button
          onClick={() => setIsMobilePreview(!isMobilePreview)}
          className="underline font-bold text-[#111D35] hover:text-[#C40054] ml-1 cursor-pointer"
        >
          {isMobilePreview ? 'Switch to Fluid Desktop (1280px+)' : 'Switch to Mobile Frame (390px)'}
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#111D35] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce border border-[#F0D7E2]">
          <span className="material-symbols-outlined text-[#F50062] text-[18px]">info</span>
          {toast}
        </div>
      )}

      {/* Device frame container rendering: Mobile Phone Frame vs Fluid Desktop */}
      {isMobilePreview ? (
        <div className="flex-1 py-4 sm:py-8 px-2 flex flex-col items-center justify-center bg-[#FFF1F6]/60">
          <div className="text-center mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-xs font-bold text-[#576177] shadow-xs border border-[#F0D7E2]">
              <span className="material-symbols-outlined text-[14px] text-[#C40054]">smartphone</span>
              Mobile Phone Frame (390 × 844) — Chennai Tech Squad View
            </span>
          </div>

          {/* Smartphone mock bezel */}
          <div className="w-full max-w-[400px] bg-[#151C2D] p-3 rounded-[44px] shadow-2xl border-4 border-[#111D35]">
            {/* Top Speaker & Camera Notch */}
            <div className="w-28 h-4 bg-[#151C2D] mx-auto rounded-b-xl flex items-center justify-center gap-2 mb-1">
              <div className="w-10 h-1 bg-white/20 rounded-full"></div>
              <div className="w-2 h-2 rounded-full bg-white/10"></div>
            </div>

            {/* Mobile Screen Inside */}
            <div className="bg-[#FFF9FC] rounded-[36px] overflow-hidden flex flex-col h-[760px] relative border border-[#F0D7E2]">
              <Header
                currentScreen={currentScreen}
                onNavigate={setCurrentScreen}
                currentUser={user}
                activeGroup={activeGroup}
                isMobilePreview={isMobilePreview}
                onToggleMobilePreview={() => setIsMobilePreview(false)}
              />

              <main className="flex-1 overflow-y-auto no-scrollbar pb-16">
                {renderScreen()}
              </main>

              <BottomNav
                currentScreen={currentScreen}
                onNavigate={setCurrentScreen}
                activeGroup={activeGroup}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Fluid Responsive Desktop Layout */
        <div className="flex-1 flex flex-col">
          <Header
            currentScreen={currentScreen}
            onNavigate={setCurrentScreen}
            currentUser={user}
            activeGroup={activeGroup}
            isMobilePreview={isMobilePreview}
            onToggleMobilePreview={() => setIsMobilePreview(true)}
          />

          <main className="flex-1 pb-16 lg:pb-8">
            {renderScreen()}
          </main>

          <BottomNav
            currentScreen={currentScreen}
            onNavigate={setCurrentScreen}
            activeGroup={activeGroup}
          />
        </div>
      )}
    </div>
  );
}
