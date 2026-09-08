const { withInfoPlist } = require('expo/config-plugins');

/**
 * Guideline 2.5.4: do not declare UIBackgroundModes "audio" unless the app
 * plays persistent audio after the user leaves. Voice notes are foreground-only.
 *
 * @type {import('expo/config-plugins').ConfigPlugin}
 */
function withNoBackgroundAudio(config) {
  return withInfoPlist(config, (cfg) => {
    const modes = cfg.modResults.UIBackgroundModes;
    if (!Array.isArray(modes)) {
      return cfg;
    }

    const next = modes.filter((mode) => mode !== 'audio');
    if (next.length === 0) {
      delete cfg.modResults.UIBackgroundModes;
    } else {
      cfg.modResults.UIBackgroundModes = next;
    }
    return cfg;
  });
}

module.exports = withNoBackgroundAudio;
