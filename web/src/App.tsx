import { AuthProvider } from './lib/auth.tsx';
import { useRoute } from './lib/router.ts';
import { Layout, RequireSignIn } from './components/Layout.tsx';
import { ExploreScreen } from './screens/ExploreScreen.tsx';
import { MenuScreen } from './screens/MenuScreen.tsx';
import { SignInScreen } from './screens/SignInScreen.tsx';
import { ProfileScreen } from './screens/ProfileScreen.tsx';

function Screen() {
  const route = useRoute();
  let body;
  switch (route.name) {
    case 'menu': body = <MenuScreen rid={route.rid} />; break;
    case 'signin': body = <SignInScreen next={route.next} />; break;
    case 'profile': body = <RequireSignIn why="Sign in to see your profile."><ProfileScreen /></RequireSignIn>; break;
    default: body = <ExploreScreen />;
  }
  return <Layout route={route}>{body}</Layout>;
}

export default function App() {
  return <AuthProvider><Screen /></AuthProvider>;
}
