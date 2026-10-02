// Stand-in for `firebase/app` in local preview mode.
const app = { name: '[preview]', options: {} };
export const initializeApp = () => app;
export const getApps = () => [app];
export const getApp = () => app;
