import * as fs from 'fs';
import * as path from 'path';
import type {
  NormalizedManifest,
  ManifestParseResult,
  ExtensionType,
  VSCodeEngineCompatibility,
  ContributionPoints,
} from '../../../../src/types/extensionRegistry';

export class VSCodeExtensionManifestParser {
  // Regex for standard VS Code extension identifiers (publisher and name)
  private static readonly ID_SEGMENT_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

  // Basic SemVer regex conforming to Semantic Versioning 2.0.0
  private static readonly SEMVER_REGEX =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

  /**
   * Parses and validates a VS Code extension manifest (package.json) located at manifestPath
   * inside the extension directory root (installPath).
   *
   * STRICT GUARANTEE: Does NOT require(), execute code, or invoke child processes. Pure static analysis.
   */
  public static parseAndValidate(installPath: string, manifestPath?: string): ManifestParseResult {
    const resolvedInstallPath = path.resolve(installPath);
    const resolvedManifestPath = manifestPath
      ? path.resolve(manifestPath)
      : this.findManifestPath(resolvedInstallPath);

    if (!resolvedManifestPath || !fs.existsSync(resolvedManifestPath)) {
      return {
        valid: false,
        errors: [`Manifest package.json not found in extension directory: ${resolvedInstallPath}`],
        errorCode: 'MISSING_MANIFEST',
      };
    }

    const effectiveInstallPath = path.dirname(resolvedManifestPath);

    let rawJson: any;
    try {
      const rawText = fs.readFileSync(resolvedManifestPath, 'utf8');
      rawJson = JSON.parse(rawText);
    } catch (err: any) {
      return {
        valid: false,
        errors: [`Failed to parse package.json JSON: ${err?.message || String(err)}`],
        errorCode: 'CORRUPTED_JSON',
      };
    }

    if (typeof rawJson !== 'object' || rawJson === null || Array.isArray(rawJson)) {
      return {
        valid: false,
        errors: ['package.json root must be a JSON object'],
        errorCode: 'INVALID_MANIFEST',
      };
    }

    const errors: string[] = [];

    // 1. Required Fields: Name
    const rawName = rawJson.name;
    if (!rawName || typeof rawName !== 'string' || !rawName.trim()) {
      errors.push('Manifest missing required field: "name"');
    } else if (!this.ID_SEGMENT_REGEX.test(rawName.trim())) {
      errors.push(`Manifest "name" contains invalid characters: "${rawName}"`);
    }

    // 2. Identity: Publisher & VS Code Extension ID
    const rawPublisher = rawJson.publisher;
    let publisher = '';
    if (!rawPublisher || typeof rawPublisher !== 'string' || !rawPublisher.trim()) {
      errors.push('Manifest missing required field: "publisher" (required for VS Code extension ID)');
    } else if (!this.ID_SEGMENT_REGEX.test(rawPublisher.trim())) {
      errors.push(`Manifest "publisher" contains invalid characters: "${rawPublisher}"`);
    } else {
      publisher = rawPublisher.trim();
    }

    const name = (rawName || '').trim();
    const id = publisher && name ? `${publisher}.${name}` : '';

    // 3. Required Fields: Version
    const rawVersion = rawJson.version;
    let version = '1.0.0';
    if (!rawVersion || typeof rawVersion !== 'string' || !rawVersion.trim()) {
      errors.push('Manifest missing required field: "version"');
    } else {
      const trimmedVer = rawVersion.trim();
      if (!this.SEMVER_REGEX.test(trimmedVer)) {
        errors.push(`Manifest "version" is not valid SemVer format: "${trimmedVer}"`);
      } else {
        version = trimmedVer;
      }
    }

    // 4. Security & Path Traversal Validation for Runtime Endpoints (main, browser)
    const rawMain = typeof rawJson.main === 'string' ? rawJson.main.trim() : undefined;
    const rawBrowser = typeof rawJson.browser === 'string' ? rawJson.browser.trim() : undefined;

    // Check main path
    let validatedMain: string | undefined = undefined;
    if (rawMain) {
      const check = this.validateAndResolveRelativePath(effectiveInstallPath, rawMain, false);
      if (!check.valid) {
        if (check.isTraversal) {
          return {
            valid: false,
            errors: [`EXTENSION_PATH_TRAVERSAL detected in main: ${check.error}`],
            errorCode: 'EXTENSION_PATH_TRAVERSAL',
          };
        }
        validatedMain = rawMain;
      } else {
        // If main points to a non-existent file on disk, check if a standard bundled entrypoint exists
        const target = check.resolvedPath;
        if (target && !fs.existsSync(target) && !fs.existsSync(`${target}.js`) && !fs.existsSync(`${target}.cjs`)) {
          const fallbacks = [
            'extension.js',
            'dist/extension.js',
            'dist/index.js',
            'out/extension.js',
            'out/index.js',
            'index.js',
          ];
          const found = fallbacks.find((f) => fs.existsSync(path.join(effectiveInstallPath, f)));
          validatedMain = found ? `./${found.replace(/\\/g, '/')}` : rawMain;
        } else {
          validatedMain = rawMain;
        }
      }
    }

    // Check browser path
    let validatedBrowser: string | undefined = undefined;
    if (rawBrowser) {
      const check = this.validateAndResolveRelativePath(effectiveInstallPath, rawBrowser, false);
      if (!check.valid) {
        if (check.isTraversal) {
          return {
            valid: false,
            errors: [`EXTENSION_PATH_TRAVERSAL detected in browser: ${check.error}`],
            errorCode: 'EXTENSION_PATH_TRAVERSAL',
          };
        }
        validatedBrowser = rawBrowser;
      } else {
        validatedBrowser = rawBrowser;
      }
    }

    // Check icon path if present
    let iconDataUri: string | undefined = undefined;
    if (typeof rawJson.icon === 'string' && rawJson.icon.trim()) {
      const iconRel = rawJson.icon.trim();
      const check = this.validateAndResolveRelativePath(effectiveInstallPath, iconRel, false);
      if (!check.valid && check.isTraversal) {
        return {
          valid: false,
          errors: [`EXTENSION_PATH_TRAVERSAL detected in icon path: ${check.error}`],
          errorCode: 'EXTENSION_PATH_TRAVERSAL',
        };
      }
      if (check.valid && check.resolvedPath && fs.existsSync(check.resolvedPath)) {
        try {
          const ext = path.extname(check.resolvedPath).toLowerCase().replace('.', '');
          const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext || 'png'}`;
          const b64 = fs.readFileSync(check.resolvedPath).toString('base64');
          iconDataUri = `data:${mime};base64,${b64}`;
        } catch {}
      }
    }

    // 5. VS Code Compatibility
    const compatibility = this.evaluateCompatibility(rawJson.engines);

    // 6. Contributions Extraction
    const contributes = this.normalizeContributions(rawJson.contributes, effectiveInstallPath);
    if (contributes.hasTraversal) {
      return {
        valid: false,
        errors: [`EXTENSION_PATH_TRAVERSAL detected in contributes path: ${contributes.traversalMessage}`],
        errorCode: 'EXTENSION_PATH_TRAVERSAL',
      };
    }

    // 7. Detect Extension Type
    const extensionType = this.detectExtensionType(rawJson, validatedMain, validatedBrowser);

    // 8. Normalization
    const normalized: NormalizedManifest = {
      id: id || `${publisher || 'unknown'}.${name || 'unknown'}`,
      name,
      publisher,
      version,
      displayName: typeof rawJson.displayName === 'string' ? rawJson.displayName.trim() : name,
      description: typeof rawJson.description === 'string' ? rawJson.description.trim() : '',
      main: validatedMain,
      browser: validatedBrowser,
      extensionKind: rawJson.extensionKind,
      engines: typeof rawJson.engines === 'object' && rawJson.engines !== null ? rawJson.engines : {},
      activationEvents: Array.isArray(rawJson.activationEvents) ? rawJson.activationEvents : [],
      extensionDependencies: Array.isArray(rawJson.extensionDependencies) ? rawJson.extensionDependencies : [],
      extensionPack: Array.isArray(rawJson.extensionPack) ? rawJson.extensionPack : [],
      categories: Array.isArray(rawJson.categories) ? rawJson.categories : ['Other'],
      keywords: Array.isArray(rawJson.keywords) ? rawJson.keywords : [],
      contributes: contributes.points,
      installPath: effectiveInstallPath,
      manifestPath: resolvedManifestPath,
      manifestValid: errors.length === 0,
      validationErrors: errors,
      extensionType,
      compatibility,
      rawManifest: rawJson,
      icon: iconDataUri,
      homepage: typeof rawJson.homepage === 'string' ? rawJson.homepage : undefined,
      repository: rawJson.repository,
      bugs: rawJson.bugs,
      license: typeof rawJson.license === 'string' ? rawJson.license : undefined,
      galleryBanner: rawJson.galleryBanner,
      preview: Boolean(rawJson.preview),
      badges: Array.isArray(rawJson.badges) ? rawJson.badges : [],
    };

    return {
      valid: errors.length === 0,
      manifest: normalized,
      errors,
      errorCode: errors.length > 0 ? 'INVALID_MANIFEST' : undefined,
    };
  }

  /**
   * Helper to locate the package.json within root or root/extension
   */
  public static findManifestPath(installPath: string): string | null {
    const rootPkg = path.join(installPath, 'package.json');
    if (fs.existsSync(rootPkg)) return rootPkg;

    const innerPkg = path.join(installPath, 'extension', 'package.json');
    if (fs.existsSync(innerPkg)) return innerPkg;

    return null;
  }

  /**
   * Validates that a path is strictly relative and does not escape the installation root directory.
   */
  public static validateAndResolveRelativePath(
    installPath: string,
    relPath: string,
    requireFileExists = false
  ): { valid: boolean; resolvedPath?: string; isTraversal?: boolean; error?: string } {
    if (!relPath || typeof relPath !== 'string') {
      return { valid: false, error: 'Path must be a non-empty string' };
    }

    // Disallow absolute paths (Windows C:\ or Unix /)
    if (path.isAbsolute(relPath) || /^[a-zA-Z]:[\\\/]/.test(relPath)) {
      return { valid: false, isTraversal: true, error: `Absolute paths are prohibited: "${relPath}"` };
    }

    // Disallow paths containing traversal segments like '..'
    const normalizedPosix = relPath.replace(/\\/g, '/');
    const segments = normalizedPosix.split('/');
    if (segments.includes('..')) {
      return { valid: false, isTraversal: true, error: `Path traversal ".." detected in "${relPath}"` };
    }

    const resolvedInstallPath = path.resolve(installPath);
    const resolvedTarget = path.resolve(installPath, relPath);

    // Verify resolved path is strictly within installPath
    const relFromRoot = path.relative(resolvedInstallPath, resolvedTarget);
    if (relFromRoot.startsWith('..') || path.isAbsolute(relFromRoot)) {
      return { valid: false, isTraversal: true, error: `Target escapes extension directory: "${relPath}"` };
    }

    if (requireFileExists) {
      // Check if file exists, or if file exists with common extensions (.js, .json, .ts, etc.)
      const candidates = [
        resolvedTarget,
        `${resolvedTarget}.js`,
        `${resolvedTarget}.cjs`,
        `${resolvedTarget}.mjs`,
        path.join(resolvedTarget, 'index.js'),
      ];
      const found = candidates.find((c) => fs.existsSync(c));
      if (!found) {
        return { valid: false, resolvedPath: resolvedTarget, error: `Target file does not exist: "${relPath}"` };
      }
      return { valid: true, resolvedPath: found };
    }

    return { valid: true, resolvedPath: resolvedTarget };
  }

  /**
   * Evaluates VS Code compatibility requirement from engines.vscode
   */
  private static evaluateCompatibility(engines: any): VSCodeEngineCompatibility {
    if (!engines || typeof engines !== 'object') {
      return { compatible: true, notes: 'No engine restrictions specified' };
    }

    const vscodeEngine = typeof engines.vscode === 'string' ? engines.vscode.trim() : undefined;
    if (!vscodeEngine) {
      return { compatible: true, notes: 'No engines.vscode requirement' };
    }

    return {
      compatible: true,
      requiredVSCodeVersion: vscodeEngine,
      notes: `Requires VS Code engine ${vscodeEngine}`,
    };
  }

  /**
   * Detects the probable primary extension type based on runtime files and contribution points.
   */
  private static detectExtensionType(
    rawJson: any,
    validatedMain?: string,
    validatedBrowser?: string
  ): ExtensionType {
    const hasMain = Boolean(validatedMain || rawJson.main);
    const hasBrowser = Boolean(validatedBrowser || rawJson.browser);
    const contrib = rawJson.contributes;

    if (!contrib && !hasMain && !hasBrowser) {
      return 'unknown';
    }

    if (hasMain && hasBrowser) {
      return 'mixed';
    }

    if (hasMain) {
      // Node extension or mixed if it has rich contributions
      return 'node';
    }

    if (hasBrowser) {
      return 'web';
    }

    if (contrib && typeof contrib === 'object') {
      const keys = Object.keys(contrib);
      if (keys.length === 1) {
        if (keys[0] === 'themes' || keys[0] === 'iconThemes') return 'theme';
        if (keys[0] === 'languages') return 'language';
        if (keys[0] === 'snippets') return 'snippet';
        if (keys[0] === 'grammars') return 'grammar';
      }

      const onlyThemes = keys.every((k) => k === 'themes' || k === 'iconThemes' || k === 'colors');
      if (onlyThemes) return 'theme';

      const onlyLanguages = keys.every((k) => k === 'languages' || k === 'grammars' || k === 'snippets');
      if (onlyLanguages) return 'language';

      return 'mixed';
    }

    return 'unknown';
  }

  /**
   * Normalizes contributes section and verifies relative asset paths.
   */
  private static normalizeContributions(
    rawContributes: any,
    installPath: string
  ): { points: ContributionPoints; hasTraversal: boolean; traversalMessage?: string } {
    if (!rawContributes || typeof rawContributes !== 'object' || Array.isArray(rawContributes)) {
      return { points: {}, hasTraversal: false };
    }

    // Check contribution asset paths for traversal
    const pathKeysToCheck: Array<{ container: string; pathProp: string }> = [
      { container: 'themes', pathProp: 'path' },
      { container: 'iconThemes', pathProp: 'path' },
      { container: 'snippets', pathProp: 'path' },
      { container: 'grammars', pathProp: 'path' },
    ];

    for (const item of pathKeysToCheck) {
      const arr = rawContributes[item.container];
      if (Array.isArray(arr)) {
        for (const entry of arr) {
          if (entry && typeof entry[item.pathProp] === 'string') {
            const check = this.validateAndResolveRelativePath(installPath, entry[item.pathProp], false);
            if (!check.valid && check.isTraversal) {
              return {
                points: {},
                hasTraversal: true,
                traversalMessage: `Path traversal in contributes.${item.container}[].${item.pathProp}: ${check.error}`,
              };
            }
          }
        }
      }
    }

    return {
      points: rawContributes as ContributionPoints,
      hasTraversal: false,
    };
  }
}
