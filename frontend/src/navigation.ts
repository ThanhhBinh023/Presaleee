export type RouteName = 'home' | 'signin' | 'overview' | 'members' | 'profile';

export const navigateTo = (route: RouteName): void => {
  window.location.hash = route === 'home' ? '' : `#${route}`;
};
