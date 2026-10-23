import { useEffect } from 'react';
import { AuthProvider } from './lib/auth.tsx';
import { navigateHash, useRoute } from './lib/router.ts';
import { Layout, RequireSignIn } from './components/Layout.tsx';
import { ExploreScreen } from './screens/ExploreScreen.tsx';
import { MenuScreen } from './screens/MenuScreen.tsx';
import { SignInScreen } from './screens/SignInScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';
import { StartGroupScreen } from './screens/StartGroupScreen.tsx';
import { JoinScreen } from './screens/JoinScreen.tsx';
import { CartScreen } from './screens/CartScreen.tsx';
import { CheckoutScreen } from './screens/CheckoutScreen.tsx';
import { ConfirmationScreen } from './screens/ConfirmationScreen.tsx';
import { PayScreen } from './screens/PayScreen.tsx';
import { TrackScreen } from './screens/TrackScreen.tsx';
import { OrdersScreen } from './screens/OrdersScreen.tsx';
import { ActivityScreen } from './screens/ActivityScreen.tsx';

function Screen() {
  const route = useRoute();
  let body;
  switch (route.name) {
    case 'menu': body = <MenuScreen rid={route.rid} />; break;
    case 'signin': body = <SignInScreen next={route.next} />; break;
    case 'profile': body = <RequireSignIn why="Sign in to see your profile."><ProfileScreen /></RequireSignIn>; break;
    case 'start': body = <RequireSignIn why="Sign in to start a group order."><StartGroupScreen rid={route.rid} /></RequireSignIn>; break;
    case 'join': body = <JoinScreen code={route.code} />; break;
    case 'cart': body = <RequireSignIn why="Sign in to see this group order."><CartScreen gid={route.gid} /></RequireSignIn>; break;
    case 'checkout': body = <RequireSignIn><CheckoutScreen gid={route.gid} /></RequireSignIn>; break;
    case 'confirmed': body = <RequireSignIn><ConfirmationScreen gid={route.gid} /></RequireSignIn>; break;
    case 'pay': body = <RequireSignIn><PayScreen gid={route.gid} /></RequireSignIn>; break;
    case 'track': body = <RequireSignIn><TrackScreen gid={route.gid} /></RequireSignIn>; break;
    case 'activity': body = <RequireSignIn><ActivityScreen gid={route.gid} /></RequireSignIn>; break;
    case 'orders': body = <RequireSignIn why="Sign in to see your orders."><OrdersScreen /></RequireSignIn>; break;
    default: body = <ExploreScreen />;
  }
  return <Layout route={route}>{body}</Layout>;
}

export default function App() {
  // A shared link looks like site?join=CODE. Move it to the join screen and tidy the address bar.
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('join');
    if (raw !== null) {
      window.history.replaceState(null, '', window.location.pathname);
      navigateHash(`#/join/${encodeURIComponent(raw.trim())}`);
    }
  }, []);
  return <AuthProvider><Screen /></AuthProvider>;
}
