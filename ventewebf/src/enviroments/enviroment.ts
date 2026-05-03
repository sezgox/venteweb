// environment.ts (desarrollo)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api', // 'https://1wr381qv-3000.uks1.devtunnels.ms/api',
  /** Custom scheme + host; must match Android/iOS app manifest and DeepLinksService (vente://app/...) */
  activationAppDeepLinkBase: 'vente://app',
  firebase: {
    apiKey: 'AIzaSyBNBjqRfN_TNPxlt_a9uLh926pKRJpX-yk',
    projectId: 'vente-66da5',
  },
  googleOAuthClientId: '972623508117-oi9hu7oiij1duqm5pmfk07fofft3ock7.apps.googleusercontent.com',
  googleMapsApiKey: 'AIzaSyCHwitDwBixgbmWvyfqzIEQGoYsohhD3wE',
  googleMapsMapId: 'f0cc5b6e278a50fda2f31d7b'
};
