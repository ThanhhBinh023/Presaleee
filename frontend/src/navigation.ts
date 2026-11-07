export type RouteName =
  | 'home'
  | 'signin'
  | 'overview'
  | 'members'
  | 'profile'
  | 'clients'
  | 'audit'
  | 'leads'
  | 'rfps'
  | 'rate-cards'
  | 'meetings'
  | 'proposals'
  | 'ai-workspace'
  | 'vault';

export const navigateTo = (route: RouteName, query?: Record<string, string>): void => {
  const params = query && Object.keys(query).length > 0 ? `?${new URLSearchParams(query).toString()}` : '';
  window.location.hash = route === 'home' ? '' : `#${route}${params}`;
};

export const readHashQuery = (): URLSearchParams => {
  const query = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(query);
};
