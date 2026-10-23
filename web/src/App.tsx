import { AuthProvider } from './lib/auth.tsx';
import { useRoute } from './lib/router.ts';
import { Layout } from './components/Layout.tsx';
import { ExploreScreen } from './screens/ExploreScreen.tsx';
import { MenuScreen } from './screens/MenuScreen.tsx';

function Screen() {
  const route = useRoute();
  let body;
  switch (route.name) {
    case 'menu': body = <MenuScreen rid={route.rid} />; break;
    default: body = <ExploreScreen />;
  }
  return <Layout route={route}>{body}</Layout>;
}

export default function App() {
  return <AuthProvider><Screen /></AuthProvider>;
}
