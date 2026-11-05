export type RouteName = 'home' | 'signin' | 'overview' | 'members' | 'profile' | 'clients' | 'audit';

export const navigateTo = (route: RouteName): void => {
  window.location.hash = route === 'home' ? '' : `#${route}`;
};
