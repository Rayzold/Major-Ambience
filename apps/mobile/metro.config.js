// Metro config for the Expo mobile app inside a pnpm monorepo.
//
// Two jobs:
//   1. Make Metro see the workspace root (so symlinked @mc/* packages
//      resolve and live reloads pick up edits across the repo).
//   2. Transparently fall back from `import "./foo.js"` to `./foo.ts`
//      for relative imports — the workspace TS packages use the
//      bundler-style `.js` extension on TS source files
//      (moduleResolution: "Bundler" in tsconfig.base.json), which
//      Metro's default resolver doesn't strip.

const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo so cross-package edits hot-reload.
config.watchFolders = [workspaceRoot];

// 2. Tell Metro where to look up packages. Order matters: app first,
//    then workspace root (so a hoisted version in apps/mobile wins).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Keep hierarchical lookup ON. The Expo monorepo guide turns it off,
//    but that assumes a yarn/npm flat node_modules layout. With pnpm's
//    isolated store, transitive deps live as siblings inside
//    `node_modules/.pnpm/<pkg>@<v>_…/node_modules/`. Metro needs to walk
//    up from an importing file (e.g. @expo/metro-runtime) to find its
//    sibling (e.g. @expo/log-box) — disabling that lookup breaks the
//    chain. Leaving the default ON resolves the cascade.

// 4. Workspace TS packages use ESM `.js` extensions on imports of .ts
//    source (tsconfig moduleResolution: "Bundler"). Metro respects the
//    explicit `.js`, so transparently fall back to `.ts` / `.tsx` for
//    relative imports. Bare-spec resolution (node_modules) is untouched.
const wrapResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    (moduleName.startsWith("./") || moduleName.startsWith("../")) &&
    moduleName.endsWith(".js")
  ) {
    for (const ext of [".ts", ".tsx"]) {
      try {
        return context.resolveRequest(
          context,
          moduleName.replace(/\.js$/, ext),
          platform,
        );
      } catch {
        // try next extension
      }
    }
  }
  return wrapResolveRequest
    ? wrapResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
