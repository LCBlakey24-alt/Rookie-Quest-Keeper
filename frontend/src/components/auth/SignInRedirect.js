import { Navigate, useLocation } from 'react-router-dom';

export function getSignInDestination(from) {
  const pathname = from?.pathname;
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || pathname.startsWith('//')
      || /[\\\u0000-\u001f?#]/.test(pathname) || /^\/auth(?:\/|$)/.test(pathname)) {
    return { to: '/home', state: undefined };
  }
  const search = typeof from.search === 'string' && from.search.startsWith('?') ? from.search : '';
  const hash = typeof from.hash === 'string' && from.hash.startsWith('#') ? from.hash : '';
  return { to: `${pathname}${search}${hash}`, state: from.state };
}

export default function SignInRedirect() {
  const location = useLocation();
  return <Navigate to="/auth" state={{ from: location }} replace />;
}

export function PostSignInRedirect() {
  const location = useLocation();
  const destination = getSignInDestination(location.state?.from);
  return <Navigate to={destination.to} state={destination.state} replace />;
}
