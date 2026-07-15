const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude pnpm temp extraction directories that Metro tries to watch.
// react-native-webview (and other native pkgs) create _tmp_NNN dirs during install.
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tmpPattern = new RegExp(escape('react-native-webview') + '.*_tmp_\\d+');
config.resolver.blockList = [tmpPattern];

module.exports = config;
