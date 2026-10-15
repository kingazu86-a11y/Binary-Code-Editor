"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/test-runner.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var os2 = __toESM(require("os"));

// electron/main/services/extensions/VSCodeExtensionManifestParser.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var VSCodeExtensionManifestParser = class {
  // Regex for standard VS Code extension identifiers (publisher and name)
  static ID_SEGMENT_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
  // Basic SemVer regex conforming to Semantic Versioning 2.0.0
  static SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  /**
   * Parses and validates a VS Code extension manifest (package.json) located at manifestPath
   * inside the extension directory root (installPath).
   *
   * STRICT GUARANTEE: Does NOT require(), execute code, or invoke child processes. Pure static analysis.
   */
  static parseAndValidate(installPath, manifestPath) {
    const resolvedInstallPath = path.resolve(installPath);
    const resolvedManifestPath = manifestPath ? path.resolve(manifestPath) : this.findManifestPath(resolvedInstallPath);
    if (!resolvedManifestPath || !fs.existsSync(resolvedManifestPath)) {
      return {
        valid: false,
        errors: [`Manifest package.json not found in extension directory: ${resolvedInstallPath}`],
        errorCode: "MISSING_MANIFEST"
      };
    }
    const effectiveInstallPath = path.dirname(resolvedManifestPath);
    let rawJson;
    try {
      const rawText = fs.readFileSync(resolvedManifestPath, "utf8");
      rawJson = JSON.parse(rawText);
    } catch (err) {
      return {
        valid: false,
        errors: [`Failed to parse package.json JSON: ${err?.message || String(err)}`],
        errorCode: "CORRUPTED_JSON"
      };
    }
    if (typeof rawJson !== "object" || rawJson === null || Array.isArray(rawJson)) {
      return {
        valid: false,
        errors: ["package.json root must be a JSON object"],
        errorCode: "INVALID_MANIFEST"
      };
    }
    const errors = [];
    const rawName = rawJson.name;
    if (!rawName || typeof rawName !== "string" || !rawName.trim()) {
      errors.push('Manifest missing required field: "name"');
    } else if (!this.ID_SEGMENT_REGEX.test(rawName.trim())) {
      errors.push(`Manifest "name" contains invalid characters: "${rawName}"`);
    }
    const rawPublisher = rawJson.publisher;
    let publisher = "";
    if (!rawPublisher || typeof rawPublisher !== "string" || !rawPublisher.trim()) {
      errors.push('Manifest missing required field: "publisher" (required for VS Code extension ID)');
    } else if (!this.ID_SEGMENT_REGEX.test(rawPublisher.trim())) {
      errors.push(`Manifest "publisher" contains invalid characters: "${rawPublisher}"`);
    } else {
      publisher = rawPublisher.trim();
    }
    const name = (rawName || "").trim();
    const id = publisher && name ? `${publisher}.${name}` : "";
    const rawVersion = rawJson.version;
    let version = "1.0.0";
    if (!rawVersion || typeof rawVersion !== "string" || !rawVersion.trim()) {
      errors.push('Manifest missing required field: "version"');
    } else {
      const trimmedVer = rawVersion.trim();
      if (!this.SEMVER_REGEX.test(trimmedVer)) {
        errors.push(`Manifest "version" is not valid SemVer format: "${trimmedVer}"`);
      } else {
        version = trimmedVer;
      }
    }
    const rawMain = typeof rawJson.main === "string" ? rawJson.main.trim() : void 0;
    const rawBrowser = typeof rawJson.browser === "string" ? rawJson.browser.trim() : void 0;
    let validatedMain = void 0;
    if (rawMain) {
      const check = this.validateAndResolveRelativePath(effectiveInstallPath, rawMain, false);
      if (!check.valid) {
        if (check.isTraversal) {
          return {
            valid: false,
            errors: [`EXTENSION_PATH_TRAVERSAL detected in main: ${check.error}`],
            errorCode: "EXTENSION_PATH_TRAVERSAL"
          };
        }
        validatedMain = rawMain;
      } else {
        const target = check.resolvedPath;
        if (target && !fs.existsSync(target) && !fs.existsSync(`${target}.js`) && !fs.existsSync(`${target}.cjs`)) {
          const fallbacks = [
            "extension.js",
            "dist/extension.js",
            "dist/index.js",
            "out/extension.js",
            "out/index.js",
            "index.js"
          ];
          const found = fallbacks.find((f) => fs.existsSync(path.join(effectiveInstallPath, f)));
          validatedMain = found ? `./${found.replace(/\\/g, "/")}` : rawMain;
        } else {
          validatedMain = rawMain;
        }
      }
    }
    let validatedBrowser = void 0;
    if (rawBrowser) {
      const check = this.validateAndResolveRelativePath(effectiveInstallPath, rawBrowser, false);
      if (!check.valid) {
        if (check.isTraversal) {
          return {
            valid: false,
            errors: [`EXTENSION_PATH_TRAVERSAL detected in browser: ${check.error}`],
            errorCode: "EXTENSION_PATH_TRAVERSAL"
          };
        }
        validatedBrowser = rawBrowser;
      } else {
        validatedBrowser = rawBrowser;
      }
    }
    let iconDataUri = void 0;
    if (typeof rawJson.icon === "string" && rawJson.icon.trim()) {
      const iconRel = rawJson.icon.trim();
      const check = this.validateAndResolveRelativePath(effectiveInstallPath, iconRel, false);
      if (!check.valid && check.isTraversal) {
        return {
          valid: false,
          errors: [`EXTENSION_PATH_TRAVERSAL detected in icon path: ${check.error}`],
          errorCode: "EXTENSION_PATH_TRAVERSAL"
        };
      }
      if (check.valid && check.resolvedPath && fs.existsSync(check.resolvedPath)) {
        try {
          const ext = path.extname(check.resolvedPath).toLowerCase().replace(".", "");
          const mime = ext === "svg" ? "image/svg+xml" : `image/${ext || "png"}`;
          const b64 = fs.readFileSync(check.resolvedPath).toString("base64");
          iconDataUri = `data:${mime};base64,${b64}`;
        } catch {
        }
      }
    }
    const compatibility = this.evaluateCompatibility(rawJson.engines);
    const contributes = this.normalizeContributions(rawJson.contributes, effectiveInstallPath);
    if (contributes.hasTraversal) {
      return {
        valid: false,
        errors: [`EXTENSION_PATH_TRAVERSAL detected in contributes path: ${contributes.traversalMessage}`],
        errorCode: "EXTENSION_PATH_TRAVERSAL"
      };
    }
    const extensionType = this.detectExtensionType(rawJson, validatedMain, validatedBrowser);
    const normalized = {
      id: id || `${publisher || "unknown"}.${name || "unknown"}`,
      name,
      publisher,
      version,
      displayName: typeof rawJson.displayName === "string" ? rawJson.displayName.trim() : name,
      description: typeof rawJson.description === "string" ? rawJson.description.trim() : "",
      main: validatedMain,
      browser: validatedBrowser,
      extensionKind: rawJson.extensionKind,
      engines: typeof rawJson.engines === "object" && rawJson.engines !== null ? rawJson.engines : {},
      activationEvents: Array.isArray(rawJson.activationEvents) ? rawJson.activationEvents : [],
      extensionDependencies: Array.isArray(rawJson.extensionDependencies) ? rawJson.extensionDependencies : [],
      extensionPack: Array.isArray(rawJson.extensionPack) ? rawJson.extensionPack : [],
      categories: Array.isArray(rawJson.categories) ? rawJson.categories : ["Other"],
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
      homepage: typeof rawJson.homepage === "string" ? rawJson.homepage : void 0,
      repository: rawJson.repository,
      bugs: rawJson.bugs,
      license: typeof rawJson.license === "string" ? rawJson.license : void 0,
      galleryBanner: rawJson.galleryBanner,
      preview: Boolean(rawJson.preview),
      badges: Array.isArray(rawJson.badges) ? rawJson.badges : []
    };
    return {
      valid: errors.length === 0,
      manifest: normalized,
      errors,
      errorCode: errors.length > 0 ? "INVALID_MANIFEST" : void 0
    };
  }
  /**
   * Helper to locate the package.json within root or root/extension
   */
  static findManifestPath(installPath) {
    const rootPkg = path.join(installPath, "package.json");
    if (fs.existsSync(rootPkg))
      return rootPkg;
    const innerPkg = path.join(installPath, "extension", "package.json");
    if (fs.existsSync(innerPkg))
      return innerPkg;
    return null;
  }
  /**
   * Validates that a path is strictly relative and does not escape the installation root directory.
   */
  static validateAndResolveRelativePath(installPath, relPath, requireFileExists = false) {
    if (!relPath || typeof relPath !== "string") {
      return { valid: false, error: "Path must be a non-empty string" };
    }
    if (path.isAbsolute(relPath) || /^[a-zA-Z]:[\\\/]/.test(relPath)) {
      return { valid: false, isTraversal: true, error: `Absolute paths are prohibited: "${relPath}"` };
    }
    const normalizedPosix = relPath.replace(/\\/g, "/");
    const segments = normalizedPosix.split("/");
    if (segments.includes("..")) {
      return { valid: false, isTraversal: true, error: `Path traversal ".." detected in "${relPath}"` };
    }
    const resolvedInstallPath = path.resolve(installPath);
    const resolvedTarget = path.resolve(installPath, relPath);
    const relFromRoot = path.relative(resolvedInstallPath, resolvedTarget);
    if (relFromRoot.startsWith("..") || path.isAbsolute(relFromRoot)) {
      return { valid: false, isTraversal: true, error: `Target escapes extension directory: "${relPath}"` };
    }
    if (requireFileExists) {
      const candidates = [
        resolvedTarget,
        `${resolvedTarget}.js`,
        `${resolvedTarget}.cjs`,
        `${resolvedTarget}.mjs`,
        path.join(resolvedTarget, "index.js")
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
  static evaluateCompatibility(engines) {
    if (!engines || typeof engines !== "object") {
      return { compatible: true, notes: "No engine restrictions specified" };
    }
    const vscodeEngine = typeof engines.vscode === "string" ? engines.vscode.trim() : void 0;
    if (!vscodeEngine) {
      return { compatible: true, notes: "No engines.vscode requirement" };
    }
    return {
      compatible: true,
      requiredVSCodeVersion: vscodeEngine,
      notes: `Requires VS Code engine ${vscodeEngine}`
    };
  }
  /**
   * Detects the probable primary extension type based on runtime files and contribution points.
   */
  static detectExtensionType(rawJson, validatedMain, validatedBrowser) {
    const hasMain = Boolean(validatedMain || rawJson.main);
    const hasBrowser = Boolean(validatedBrowser || rawJson.browser);
    const contrib = rawJson.contributes;
    if (!contrib && !hasMain && !hasBrowser) {
      return "unknown";
    }
    if (hasMain && hasBrowser) {
      return "mixed";
    }
    if (hasMain) {
      return "node";
    }
    if (hasBrowser) {
      return "web";
    }
    if (contrib && typeof contrib === "object") {
      const keys = Object.keys(contrib);
      if (keys.length === 1) {
        if (keys[0] === "themes" || keys[0] === "iconThemes")
          return "theme";
        if (keys[0] === "languages")
          return "language";
        if (keys[0] === "snippets")
          return "snippet";
        if (keys[0] === "grammars")
          return "grammar";
      }
      const onlyThemes = keys.every((k) => k === "themes" || k === "iconThemes" || k === "colors");
      if (onlyThemes)
        return "theme";
      const onlyLanguages = keys.every((k) => k === "languages" || k === "grammars" || k === "snippets");
      if (onlyLanguages)
        return "language";
      return "mixed";
    }
    return "unknown";
  }
  /**
   * Normalizes contributes section and verifies relative asset paths.
   */
  static normalizeContributions(rawContributes, installPath) {
    if (!rawContributes || typeof rawContributes !== "object" || Array.isArray(rawContributes)) {
      return { points: {}, hasTraversal: false };
    }
    const pathKeysToCheck = [
      { container: "themes", pathProp: "path" },
      { container: "iconThemes", pathProp: "path" },
      { container: "snippets", pathProp: "path" },
      { container: "grammars", pathProp: "path" }
    ];
    for (const item of pathKeysToCheck) {
      const arr = rawContributes[item.container];
      if (Array.isArray(arr)) {
        for (const entry of arr) {
          if (entry && typeof entry[item.pathProp] === "string") {
            const check = this.validateAndResolveRelativePath(installPath, entry[item.pathProp], false);
            if (!check.valid && check.isTraversal) {
              return {
                points: {},
                hasTraversal: true,
                traversalMessage: `Path traversal in contributes.${item.container}[].${item.pathProp}: ${check.error}`
              };
            }
          }
        }
      }
    }
    return {
      points: rawContributes,
      hasTraversal: false
    };
  }
};

// electron/main/services/extensions/ExtensionRegistry.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var os = __toESM(require("os"));
var ExtensionRegistry = class _ExtensionRegistry {
  static instance = null;
  rootDir;
  installedDir;
  stagingDir;
  disabledDir;
  quarantineDir;
  registryPath;
  backupPath;
  schemaVersion = 1;
  entries = /* @__PURE__ */ new Map();
  isInitialized = false;
  constructor(customRootDir) {
    this.rootDir = customRootDir || path2.join(os.homedir(), ".binary", "extensions");
    this.installedDir = path2.join(this.rootDir, "installed");
    this.stagingDir = path2.join(this.rootDir, "staging");
    this.disabledDir = path2.join(this.rootDir, "disabled");
    this.quarantineDir = path2.join(this.rootDir, "quarantine");
    this.registryPath = path2.join(this.rootDir, "registry.json");
    this.backupPath = path2.join(this.rootDir, "registry.json.bak");
  }
  static getInstance(customRootDir) {
    if (!this.instance) {
      this.instance = new _ExtensionRegistry(customRootDir);
    }
    return this.instance;
  }
  /**
   * Initializes folder structure, loads existing registry, and reconciles on-disk extensions.
   */
  async initialize() {
    this.ensureDirectories();
    this.load();
    await this.reconcile();
    this.isInitialized = true;
  }
  /**
   * Ensures all partition subdirectories exist.
   */
  ensureDirectories() {
    const dirs = [
      this.rootDir,
      this.installedDir,
      this.stagingDir,
      this.disabledDir,
      this.quarantineDir
    ];
    for (const dir of dirs) {
      if (!fs2.existsSync(dir)) {
        try {
          fs2.mkdirSync(dir, { recursive: true });
        } catch (err) {
          console.error(`[ExtensionRegistry] Failed to create directory: ${dir}`, err);
        }
      }
    }
  }
  /**
   * Loads registry.json into memory. Recovers from .bak if corrupted.
   */
  load() {
    if (!fs2.existsSync(this.registryPath)) {
      if (fs2.existsSync(this.backupPath)) {
        try {
          console.warn("[ExtensionRegistry] registry.json missing; restoring from backup...");
          fs2.copyFileSync(this.backupPath, this.registryPath);
        } catch {
        }
      } else {
        this.save();
        return true;
      }
    }
    try {
      const raw = fs2.readFileSync(this.registryPath, "utf8");
      const data = JSON.parse(raw);
      if (data && typeof data.extensions === "object") {
        this.entries.clear();
        for (const [key, entry] of Object.entries(data.extensions)) {
          if (entry && entry.id) {
            this.entries.set(entry.id.toLowerCase(), entry);
          }
        }
        return true;
      }
    } catch (err) {
      console.error("[ExtensionRegistry] Corrupted registry.json:", err.message);
      if (fs2.existsSync(this.backupPath)) {
        try {
          console.warn("[ExtensionRegistry] Recovering registry from backup file...");
          const rawBak = fs2.readFileSync(this.backupPath, "utf8");
          const dataBak = JSON.parse(rawBak);
          if (dataBak && typeof dataBak.extensions === "object") {
            this.entries.clear();
            for (const [key, entry] of Object.entries(dataBak.extensions)) {
              if (entry && entry.id) {
                this.entries.set(entry.id.toLowerCase(), entry);
              }
            }
            this.save();
            return true;
          }
        } catch (bakErr) {
          console.error("[ExtensionRegistry] Backup file also corrupted:", bakErr.message);
        }
      }
    }
    return false;
  }
  /**
   * Atomic registry write:
   * 1. Write to registry.json.tmp
   * 2. Validate written JSON integrity & schema
   * 3. Make backup of existing registry.json to registry.json.bak
   * 4. Atomically swap temp file into registry.json
   */
  save() {
    this.ensureDirectories();
    const serializable = {
      schemaVersion: this.schemaVersion,
      extensions: {}
    };
    for (const [id, entry] of this.entries.entries()) {
      serializable.extensions[entry.id] = entry;
    }
    const payload = JSON.stringify(serializable, null, 2);
    const tempFile = path2.join(
      this.rootDir,
      `.registry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.tmp`
    );
    try {
      fs2.writeFileSync(tempFile, payload, "utf8");
      const readBack = fs2.readFileSync(tempFile, "utf8");
      const parsed = JSON.parse(readBack);
      if (!parsed || parsed.schemaVersion !== this.schemaVersion || typeof parsed.extensions !== "object") {
        throw new Error("Registry self-validation check failed");
      }
      if (fs2.existsSync(this.registryPath)) {
        try {
          fs2.copyFileSync(this.registryPath, this.backupPath);
        } catch (bakErr) {
          console.warn("[ExtensionRegistry] Backup creation warning:", bakErr);
        }
      }
      try {
        fs2.renameSync(tempFile, this.registryPath);
      } catch (renameErr) {
        fs2.copyFileSync(tempFile, this.registryPath);
        try {
          fs2.unlinkSync(tempFile);
        } catch {
        }
      }
      return true;
    } catch (err) {
      console.error("[ExtensionRegistry] Failed to save registry atomically:", err);
      if (fs2.existsSync(tempFile)) {
        try {
          fs2.unlinkSync(tempFile);
        } catch {
        }
      }
      return false;
    }
  }
  /**
   * Registers or updates an extension entry in the registry.
   */
  register(entry) {
    if (!entry.id || !entry.id.includes(".")) {
      throw new Error(`Invalid extension ID format: "${entry.id}". Expected "publisher.name"`);
    }
    const key = entry.id.toLowerCase();
    const existing = this.entries.get(key);
    const updatedEntry = {
      ...entry,
      installedAt: existing?.installedAt || entry.installedAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.entries.set(key, updatedEntry);
    this.save();
  }
  /**
   * Unregisters an extension and optionally removes its installed folder.
   */
  unregister(id, removeFiles = true) {
    const key = id.toLowerCase();
    const entry = this.entries.get(key);
    if (!entry)
      return false;
    if (removeFiles && entry.installPath && fs2.existsSync(entry.installPath)) {
      try {
        fs2.rmSync(entry.installPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch (rmErr) {
        console.warn(`[ExtensionRegistry] Could not remove files at ${entry.installPath}:`, rmErr);
      }
    }
    this.entries.delete(key);
    this.save();
    return true;
  }
  get(id) {
    return this.entries.get(id.toLowerCase());
  }
  has(id) {
    return this.entries.has(id.toLowerCase());
  }
  list(filterState) {
    const list = Array.from(this.entries.values());
    if (filterState) {
      return list.filter((e) => e.state === filterState);
    }
    return list;
  }
  enable(id) {
    const entry = this.get(id);
    if (!entry)
      return false;
    entry.enabled = true;
    entry.state = "enabled";
    entry.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.save();
    return true;
  }
  disable(id) {
    const entry = this.get(id);
    if (!entry)
      return false;
    entry.enabled = false;
    entry.state = "disabled";
    entry.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.save();
    return true;
  }
  update(id, updates) {
    const entry = this.get(id);
    if (!entry)
      return false;
    Object.assign(entry, updates, { updatedAt: (/* @__PURE__ */ new Date()).toISOString() });
    this.save();
    return true;
  }
  /**
   * Validates an on-disk extension and updates its status in the registry.
   */
  validate(id) {
    const entry = this.get(id);
    if (!entry)
      return false;
    if (!fs2.existsSync(entry.installPath)) {
      entry.state = "corrupted";
      entry.manifestValid = false;
      entry.validationErrors = ["Installation path missing on filesystem"];
      this.save();
      return false;
    }
    const parseResult = VSCodeExtensionManifestParser.parseAndValidate(entry.installPath);
    if (!parseResult.valid || !parseResult.manifest) {
      entry.manifestValid = false;
      entry.state = "invalid";
      entry.validationErrors = parseResult.errors;
      this.save();
      return false;
    }
    entry.manifestValid = true;
    entry.manifest = parseResult.manifest;
    entry.version = parseResult.manifest.version;
    entry.displayName = parseResult.manifest.displayName;
    entry.description = parseResult.manifest.description;
    entry.extensionType = parseResult.manifest.extensionType;
    if (entry.state === "invalid" || entry.state === "corrupted") {
      entry.state = entry.enabled ? "enabled" : "disabled";
    }
    this.save();
    return true;
  }
  /**
   * Reconciles on-disk extension folders with registry entries.
   * Handles:
   * 1. Subdirectory `installed/`
   * 2. Legacy pre-installed folders directly under `.binary/extensions/`
   * 3. Broken or missing folder cleanup
   */
  async reconcile() {
    let added = 0;
    let updated = 0;
    let removed = 0;
    const scannedFolderPaths = [];
    if (fs2.existsSync(this.installedDir)) {
      try {
        const entries = fs2.readdirSync(this.installedDir, { withFileTypes: true });
        for (const ent of entries) {
          if (ent.isDirectory() && !ent.name.startsWith(".")) {
            scannedFolderPaths.push(path2.join(this.installedDir, ent.name));
          }
        }
      } catch {
      }
    }
    if (fs2.existsSync(this.rootDir)) {
      try {
        const entries = fs2.readdirSync(this.rootDir, { withFileTypes: true });
        const reservedNames = /* @__PURE__ */ new Set(["installed", "staging", "disabled", "quarantine"]);
        for (const ent of entries) {
          if (ent.isDirectory() && !ent.name.startsWith(".") && !reservedNames.has(ent.name)) {
            scannedFolderPaths.push(path2.join(this.rootDir, ent.name));
          }
        }
      } catch {
      }
    }
    const processedIds = /* @__PURE__ */ new Set();
    for (const folderPath of scannedFolderPaths) {
      try {
        const parseRes = VSCodeExtensionManifestParser.parseAndValidate(folderPath);
        if (!parseRes.valid || !parseRes.manifest) {
          const folderName = path2.basename(folderPath);
          const syntheticId = folderName.includes("-") ? folderName.slice(0, folderName.lastIndexOf("-")) : folderName;
          if (syntheticId.includes(".")) {
            const entry = {
              id: syntheticId,
              publisher: syntheticId.split(".")[0],
              name: syntheticId.split(".").slice(1).join("."),
              displayName: folderName,
              version: "0.0.0",
              description: "Invalid or unparseable extension",
              installPath: folderPath,
              enabled: false,
              state: "invalid",
              installedAt: (/* @__PURE__ */ new Date()).toISOString(),
              updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
              manifestValid: false,
              extensionType: "unknown",
              validationErrors: parseRes.errors
            };
            this.entries.set(syntheticId.toLowerCase(), entry);
          }
          continue;
        }
        const m = parseRes.manifest;
        const key = m.id.toLowerCase();
        processedIds.add(key);
        const existing = this.entries.get(key);
        if (!existing) {
          const newEntry = {
            id: m.id,
            publisher: m.publisher,
            name: m.name,
            displayName: m.displayName,
            version: m.version,
            description: m.description,
            installPath: folderPath,
            enabled: true,
            state: "installed",
            installedAt: (/* @__PURE__ */ new Date()).toISOString(),
            updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
            manifestValid: true,
            extensionType: m.extensionType,
            manifest: m,
            icon: m.icon,
            source: "binary"
          };
          this.entries.set(key, newEntry);
          added++;
        } else {
          existing.manifest = m;
          existing.manifestValid = true;
          existing.installPath = folderPath;
          existing.displayName = m.displayName;
          existing.description = m.description;
          existing.version = m.version;
          existing.extensionType = m.extensionType;
          if (m.icon)
            existing.icon = m.icon;
          updated++;
        }
      } catch (scanErr) {
        console.warn(`[ExtensionRegistry] Error scanning ${folderPath}:`, scanErr);
      }
    }
    for (const [key, entry] of this.entries.entries()) {
      if (entry.source === "builtin" || entry.source === "vscode")
        continue;
      if (!fs2.existsSync(entry.installPath)) {
        entry.state = "corrupted";
        entry.manifestValid = false;
        entry.validationErrors = ["Files missing on disk"];
        removed++;
      }
    }
    this.save();
    return { added, updated, removed };
  }
  /**
   * Repairs corrupted registry entries.
   */
  async repair() {
    await this.reconcile();
  }
  /**
   * SemVer version comparator:
   * Returns:
   *   1 if v1 > v2
   *  -1 if v1 < v2
   *   0 if v1 === v2
   */
  static compareVersions(v1, v2) {
    const clean1 = (v1 || "").split("-")[0].split("+")[0];
    const clean2 = (v2 || "").split("-")[0].split("+")[0];
    const parts1 = clean1.split(".").map((p) => parseInt(p, 10) || 0);
    const parts2 = clean2.split(".").map((p) => parseInt(p, 10) || 0);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2)
        return 1;
      if (p1 < p2)
        return -1;
    }
    return 0;
  }
  /**
   * Promotes an extracted extension from staging into installed/ directory atomically,
   * performs duplicate check, and finalizes the registry entry.
   */
  async promoteFromStaging(stagingFolderPath, manifest) {
    const destFolderName = `${manifest.publisher}.${manifest.name}-${manifest.version}`;
    const destinationFolder = path2.join(this.installedDir, destFolderName);
    const key = manifest.id.toLowerCase();
    const existing = this.entries.get(key);
    if (existing) {
      const cmp = _ExtensionRegistry.compareVersions(manifest.version, existing.version);
      if (cmp < 0) {
        console.warn(
          `[ExtensionRegistry] Installing older version (${manifest.version}) over existing (${existing.version})`
        );
      }
    }
    if (fs2.existsSync(destinationFolder)) {
      const trash = path2.join(
        this.rootDir,
        `.trash-${destFolderName}-${Date.now()}`
      );
      try {
        fs2.renameSync(destinationFolder, trash);
      } catch {
        fs2.rmSync(destinationFolder, { recursive: true, force: true });
      }
      setTimeout(() => {
        try {
          if (fs2.existsSync(trash))
            fs2.rmSync(trash, { recursive: true, force: true });
        } catch {
        }
      }, 500);
    }
    try {
      fs2.renameSync(stagingFolderPath, destinationFolder);
    } catch (renameErr) {
      fs2.cpSync(stagingFolderPath, destinationFolder, { recursive: true });
      try {
        fs2.rmSync(stagingFolderPath, { recursive: true, force: true });
      } catch {
      }
    }
    const finalManifestRes = VSCodeExtensionManifestParser.parseAndValidate(destinationFolder);
    const finalManifest = finalManifestRes.valid && finalManifestRes.manifest ? finalManifestRes.manifest : manifest;
    const entry = {
      id: finalManifest.id,
      publisher: finalManifest.publisher,
      name: finalManifest.name,
      displayName: finalManifest.displayName,
      version: finalManifest.version,
      description: finalManifest.description,
      installPath: destinationFolder,
      enabled: existing ? existing.enabled : true,
      state: "installed",
      installedAt: existing?.installedAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      manifestValid: true,
      extensionType: finalManifest.extensionType,
      manifest: finalManifest,
      icon: finalManifest.icon,
      source: "binary"
    };
    this.register(entry);
    return entry;
  }
};
var extensionRegistry = ExtensionRegistry.getInstance();

// scripts/test-runner.ts
async function runTests() {
  console.log("\n========================================");
  console.log("\u{1F9EA} Starting Extension Registry & Parser Tests");
  console.log("========================================\n");
  let passed = 0;
  let failed = 0;
  function assert(condition, msg) {
    if (condition) {
      console.log(`  \u2705 PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  \u274C FAIL: ${msg}`);
      failed++;
    }
  }
  const testTempDir = path3.join(os2.tmpdir(), `binary-test-extensions-${Date.now()}`);
  fs3.mkdirSync(testTempDir, { recursive: true });
  try {
    console.log("\n--- 1. Standard VS Code Extension Parsing ---");
    const validExtDir = path3.join(testTempDir, "valid-ext");
    fs3.mkdirSync(validExtDir, { recursive: true });
    fs3.writeFileSync(path3.join(validExtDir, "index.js"), "module.exports = {};");
    fs3.writeFileSync(
      path3.join(validExtDir, "package.json"),
      JSON.stringify({
        name: "prettier-vscode",
        publisher: "esbenp",
        version: "10.1.0",
        displayName: "Prettier - Code formatter",
        description: "Code formatter using prettier",
        main: "./index.js",
        engines: {
          vscode: "^1.75.0"
        },
        contributes: {
          commands: [{ command: "prettier.format", title: "Format Document" }]
        }
      })
    );
    const parseResult = VSCodeExtensionManifestParser.parseAndValidate(validExtDir);
    assert(parseResult.valid === true, "Valid manifest parsed successfully");
    assert(parseResult.manifest?.id === "esbenp.prettier-vscode", "VS Code ID constructed as publisher.name");
    assert(parseResult.manifest?.version === "10.1.0", "Version parsed");
    assert(parseResult.manifest?.compatibility.requiredVSCodeVersion === "^1.75.0", "Engines.vscode parsed");
    assert(parseResult.manifest?.extensionType === "node", "Extension type detected as node");
    assert(parseResult.manifest?.contributes.commands?.[0].command === "prettier.format", "Commands contributed");
    console.log("\n--- 2. Security & Path Traversal (EXTENSION_PATH_TRAVERSAL) ---");
    const traversalExtDir = path3.join(testTempDir, "traversal-ext");
    fs3.mkdirSync(traversalExtDir, { recursive: true });
    fs3.writeFileSync(
      path3.join(traversalExtDir, "package.json"),
      JSON.stringify({
        name: "evil-ext",
        publisher: "attacker",
        version: "1.0.0",
        main: "../../../../Windows/System32/cmd.exe"
      })
    );
    const traversalRes = VSCodeExtensionManifestParser.parseAndValidate(traversalExtDir);
    assert(traversalRes.valid === false, "Traversal manifest rejected");
    assert(traversalRes.errorCode === "EXTENSION_PATH_TRAVERSAL", "Emits EXTENSION_PATH_TRAVERSAL error code for relative ..");
    const absPathExtDir = path3.join(testTempDir, "abs-path-ext");
    fs3.mkdirSync(absPathExtDir, { recursive: true });
    fs3.writeFileSync(
      path3.join(absPathExtDir, "package.json"),
      JSON.stringify({
        name: "abs-path-ext",
        publisher: "attacker",
        version: "1.0.0",
        main: "C:\\Windows\\System32\\cmd.exe"
      })
    );
    const absRes = VSCodeExtensionManifestParser.parseAndValidate(absPathExtDir);
    assert(absRes.valid === false, "Absolute path manifest rejected");
    assert(absRes.errorCode === "EXTENSION_PATH_TRAVERSAL", "Emits EXTENSION_PATH_TRAVERSAL error code for absolute path");
    const themeTraversalDir = path3.join(testTempDir, "theme-traversal-ext");
    fs3.mkdirSync(themeTraversalDir, { recursive: true });
    fs3.writeFileSync(
      path3.join(themeTraversalDir, "package.json"),
      JSON.stringify({
        name: "theme-traversal",
        publisher: "attacker",
        version: "1.0.0",
        contributes: {
          themes: [{ label: "Malicious Theme", path: "../../../../etc/shadow" }]
        }
      })
    );
    const themeRes = VSCodeExtensionManifestParser.parseAndValidate(themeTraversalDir);
    assert(themeRes.valid === false, "Theme path traversal rejected");
    assert(themeRes.errorCode === "EXTENSION_PATH_TRAVERSAL", "Emits EXTENSION_PATH_TRAVERSAL error code for themes[]");
    console.log("\n--- 3. Extension Type Detection ---");
    const themeOnlyDir = path3.join(testTempDir, "theme-only");
    fs3.mkdirSync(themeOnlyDir, { recursive: true });
    fs3.writeFileSync(
      path3.join(themeOnlyDir, "package.json"),
      JSON.stringify({
        name: "catppuccin",
        publisher: "catppuccin",
        version: "1.0.0",
        contributes: {
          themes: [{ label: "Catppuccin Mocha", uiTheme: "vs-dark", path: "./themes/mocha.json" }]
        }
      })
    );
    const themeOnlyRes = VSCodeExtensionManifestParser.parseAndValidate(themeOnlyDir);
    assert(themeOnlyRes.manifest?.extensionType === "theme", "Detects theme extension type");
    console.log("\n--- 4. Extension Registry Layout & Atomic Saves ---");
    const registryRootDir = path3.join(testTempDir, "registry-root");
    const registry = new ExtensionRegistry(registryRootDir);
    await registry.initialize();
    assert(fs3.existsSync(registry.installedDir), "installed/ directory created");
    assert(fs3.existsSync(registry.stagingDir), "staging/ directory created");
    assert(fs3.existsSync(registry.disabledDir), "disabled/ directory created");
    assert(fs3.existsSync(registry.quarantineDir), "quarantine/ directory created");
    assert(fs3.existsSync(registry.registryPath), "registry.json created");
    registry.register({
      id: "esbenp.prettier-vscode",
      publisher: "esbenp",
      name: "prettier-vscode",
      displayName: "Prettier - Code formatter",
      version: "10.1.0",
      description: "Code formatter",
      installPath: validExtDir,
      enabled: true,
      state: "installed",
      installedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      manifestValid: true,
      extensionType: "node"
    });
    assert(registry.has("esbenp.prettier-vscode"), "Entry registered and found");
    assert(registry.has("ESBENP.PRETTIER-VSCODE"), "Lookup is case-insensitive");
    assert(fs3.existsSync(registry.backupPath), "registry.json.bak exists for crash recovery");
    registry.disable("esbenp.prettier-vscode");
    assert(registry.get("esbenp.prettier-vscode")?.enabled === false, "Extension disabled in registry");
    assert(registry.get("esbenp.prettier-vscode")?.state === "disabled", "State updated to disabled");
    registry.enable("esbenp.prettier-vscode");
    assert(registry.get("esbenp.prettier-vscode")?.enabled === true, "Extension enabled in registry");
    console.log("\n--- 5. Staging Promotion & Atomic Commit ---");
    const stageDir = path3.join(registry.stagingDir, "staging-temp-test");
    fs3.mkdirSync(stageDir, { recursive: true });
    fs3.writeFileSync(path3.join(stageDir, "index.js"), "module.exports = {};");
    fs3.writeFileSync(
      path3.join(stageDir, "package.json"),
      JSON.stringify({
        name: "sample-ext",
        publisher: "binary-team",
        version: "2.0.0",
        displayName: "Sample Extension",
        main: "./index.js"
      })
    );
    const stageParse = VSCodeExtensionManifestParser.parseAndValidate(stageDir);
    assert(stageParse.valid && !!stageParse.manifest, "Staged manifest valid");
    const promoted = await registry.promoteFromStaging(stageDir, stageParse.manifest);
    assert(promoted.id === "binary-team.sample-ext", "Promoted extension has valid ID");
    assert(fs3.existsSync(promoted.installPath), "Extension moved to installed/ partition");
    assert(!fs3.existsSync(stageDir), "Staging directory cleanly cleaned");
    assert(registry.has("binary-team.sample-ext"), "Promoted extension is in registry");
    console.log("\n--- 6. SemVer Comparison ---");
    assert(ExtensionRegistry.compareVersions("1.2.3", "1.2.0") === 1, "1.2.3 > 1.2.0");
    assert(ExtensionRegistry.compareVersions("1.0.0", "1.0.0") === 0, "1.0.0 === 1.0.0");
    assert(ExtensionRegistry.compareVersions("2.0.0", "2.1.0") === -1, "2.0.0 < 2.1.0");
    console.log("\n--- 7. Reconcile Real User System Extensions ---");
    const realUserExtDir = path3.join(os2.homedir(), ".binary", "extensions");
    if (fs3.existsSync(realUserExtDir)) {
      const liveRegistry = new ExtensionRegistry(realUserExtDir);
      await liveRegistry.initialize();
      const liveList = liveRegistry.list();
      console.log(`  Found ${liveList.length} extensions in user's live directory:`);
      for (const e of liveList) {
        console.log(`    - [${e.state}] ${e.id} v${e.version} (${e.displayName})`);
      }
      assert(liveList.length >= 1, "Live user directory successfully reconciled");
    }
  } finally {
    try {
      fs3.rmSync(testTempDir, { recursive: true, force: true });
    } catch {
    }
  }
  console.log("\n========================================");
  console.log(`\u{1F4CA} Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("========================================\n");
  if (failed > 0) {
    process.exit(1);
  }
}
runTests().catch((e) => {
  console.error("Fatal error during test run:", e);
  process.exit(1);
});
