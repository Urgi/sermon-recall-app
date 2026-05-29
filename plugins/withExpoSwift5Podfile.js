const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'Expo SDK 55 + Xcode 16: compile Expo pods as Swift 5';

const PODFILE_SNIPPET = `
    # ${MARKER} (expo/expo#42525).
    installer.pods_project.targets.each do |target|
      next unless target.name.start_with?('Expo')

      target.build_configurations.each do |build_config|
        build_config.build_settings['SWIFT_VERSION'] = '5.0'
        build_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      end
    end
`;

/** @type {import('@expo/config-plugins').ConfigPlugin} */
function withExpoSwift5Podfile(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes(MARKER)) {
        const updated = contents.replace(
          /(react_native_post_install\([\s\S]*?\)\n)/,
          `$1${PODFILE_SNIPPET}\n`,
        );
        if (updated === contents) {
          throw new Error('[withExpoSwift5Podfile] Could not find react_native_post_install in Podfile');
        }
        contents = updated;
        fs.writeFileSync(podfilePath, contents);
      }

      return cfg;
    },
  ]);
}

module.exports = withExpoSwift5Podfile;
