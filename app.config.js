// A development build and the App Store build share a bundle identifier by
// default, so installing one replaces the other — which is why the dev client
// kept disappearing after each TestFlight install. The development variant
// takes its own identifier and name so both live on the phone at once.
//
// APP_VARIANT comes from the matching eas.json build profile, or from the npm
// script for a local Metro session.
const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

function uniqueIdentifier(base) {
  if (IS_DEV) return `${base}.dev`;
  if (IS_PREVIEW) return `${base}.preview`;
  return base;
}

function appName(base) {
  if (IS_DEV) return `${base} (تطوير)`;
  if (IS_PREVIEW) return `${base} (معاينة)`;
  return base;
}

module.exports = ({ config }) => ({
  ...config,
  name: appName(config.name),
  ios: {
    ...config.ios,
    bundleIdentifier: uniqueIdentifier(config.ios.bundleIdentifier),
  },
  android: {
    ...config.android,
    package: uniqueIdentifier(config.android.package),
  },
});
