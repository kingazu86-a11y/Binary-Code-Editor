import { api } from '../services/api';
import { ExtensionManifest, MarketplaceExtensionItem } from '../types/electron';
import { normalizeReadmeImageUrls, deriveRawBaseUrl } from './ImageURLNormalizer';

export interface ContributedCommand {
  command: string;
  title: string;
  category?: string;
  enablement?: string;
}

export interface ContributedConfigurationProperty {
  type?: string;
  default?: any;
  description?: string;
  enum?: any[];
  enumDescriptions?: string[];
  markdownDescription?: string;
}

export interface ContributedConfiguration {
  title?: string;
  properties?: Record<string, ContributedConfigurationProperty>;
}

export interface ContributedKeybinding {
  command: string;
  key: string;
  mac?: string;
  linux?: string;
  win?: string;
  when?: string;
}

export interface ExtensionContributions {
  commands?: ContributedCommand[];
  configuration?: ContributedConfiguration | ContributedConfiguration[];
  keybindings?: ContributedKeybinding[];
  themes?: Array<{ id: string; label: string; uiTheme: string; path: string }>;
  snippets?: Array<{ language: string; path: string }>;
  languages?: Array<{ id: string; aliases?: string[]; extensions?: string[] }>;
}

export interface ExtensionDetailData {
  id: string; // e.g. "ms-python.python"
  name: string; // e.g. "python"
  namespace: string; // e.g. "ms-python"
  displayName: string;
  version: string;
  publisher: string;
  publisherDisplayName?: string;
  verified: boolean;
  description: string;
  license?: string;
  repository?: string;
  homepage?: string;
  iconUrl?: string;
  downloadUrl?: string;
  downloads: number;
  rating?: number;
  reviewCount?: number;
  lastUpdated?: string;
  categories: string[];
  tags: string[];
  readmeMarkdown: string;
  changelogMarkdown?: string;
  contributes?: ExtensionContributions;
  installed: boolean;
  installedVersion?: string;
  installedPath?: string;
  enabled: boolean;
  source?: 'builtin' | 'vscode' | 'binary' | 'unpacked' | 'marketplace';
}

class ExtensionDetailService {
  private cache = new Map<string, ExtensionDetailData>();

  /**
   * Parse ID into namespace and name
   * e.g. "ms-python.python" -> { namespace: "ms-python", name: "python" }
   */
  public parseExtensionId(id: string): { namespace: string; name: string } {
    const parts = id.split('.');
    if (parts.length >= 2) {
      return {
        namespace: parts[0],
        name: parts.slice(1).join('.'),
      };
    }
    return {
      namespace: 'community',
      name: id,
    };
  }

  /**
   * Fetch online extension metadata & README from Open VSX
   */
  public async fetchOnlineExtension(id: string): Promise<ExtensionDetailData> {
    const { namespace, name } = this.parseExtensionId(id);
    const apiUrl = `https://open-vsx.org/api/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;

    let meta: any = null;
    try {
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Binary-IDE' },
      });
      if (!res.ok) {
        throw new Error(`Open VSX API responded with ${res.status}: ${res.statusText}`);
      }
      meta = await res.json();
    } catch (err: any) {
      console.warn(`[ExtensionDetailService] Failed to fetch online metadata for ${id}:`, err.message);
      // If full API fails, return minimum placeholder data
      return this.createMinimalOnlineFallback(id);
    }

    const publisher = meta.namespace || namespace;
    const extName = meta.name || name;
    const displayName = meta.displayName || extName;
    const version = meta.version || '1.0.0';
    const description = meta.description || '';
    const license = meta.license || undefined;
    const repository = meta.repository || undefined;
    const homepage = meta.homepage || undefined;
    const iconUrl = meta.files?.icon || undefined;
    const downloadUrl = meta.files?.download || undefined;
    const downloads = meta.downloadCount || meta.downloads || 0;
    const rating = meta.averageRating || undefined;
    const reviewCount = meta.reviewCount || undefined;
    const verified = Boolean(meta.verified);
    const lastUpdated = meta.timestamp ? new Date(meta.timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) : undefined;
    const categories: string[] = Array.isArray(meta.categories) ? meta.categories : [];
    const tags: string[] = Array.isArray(meta.tags) ? meta.tags : [];

    // Base URL for relative screenshots: use Open VSX file endpoint or GitHub raw repo
    const readmeUrl = meta.files?.readme;
    const changelogUrl = meta.files?.changelog;
    const manifestUrl = meta.files?.manifest;

    const rawBaseUrl = deriveRawBaseUrl(readmeUrl || repository || `https://open-vsx.org/api/${publisher}/${extName}/${version}/file/`);

    // Fetch README
    let readme = '';
    if (readmeUrl) {
      readme = await this.fetchMarkdownContent(readmeUrl);
    }

    // Fallback to GitHub raw README if Open VSX readme was empty and repository is GitHub
    if (!readme && repository) {
      const ghRawBase = deriveRawBaseUrl(repository);
      if (ghRawBase) {
        readme = await this.fetchMarkdownContent(`${ghRawBase}README.md`);
      }
    }

    if (!readme) {
      readme = `# ${displayName}\n\n${description}\n\n*No README.md documentation available for this extension.*`;
    }

    // Normalize relative image URLs in README
    const normalizedReadme = normalizeReadmeImageUrls(readme, rawBaseUrl);

    // Fetch CHANGELOG if available
    let changelog = '';
    if (changelogUrl) {
      changelog = await this.fetchMarkdownContent(changelogUrl);
    } else if (repository) {
      const ghRawBase = deriveRawBaseUrl(repository);
      if (ghRawBase) {
        changelog = await this.fetchMarkdownContent(`${ghRawBase}CHANGELOG.md`);
      }
    }

    // Fetch manifest for contributes schema if available
    let contributes: ExtensionContributions | undefined = undefined;
    if (manifestUrl) {
      try {
        const mRes = await fetch(manifestUrl);
        if (mRes.ok) {
          const mJson = await mRes.json();
          if (mJson.contributes) {
            contributes = mJson.contributes;
          }
        }
      } catch {}
    }

    const detail: ExtensionDetailData = {
      id,
      name: extName,
      namespace: publisher,
      displayName,
      version,
      publisher: meta.publishedBy?.login || publisher,
      publisherDisplayName: meta.namespaceDisplayName || publisher,
      verified,
      description,
      license,
      repository,
      homepage,
      iconUrl,
      downloadUrl,
      downloads,
      rating,
      reviewCount,
      lastUpdated,
      categories,
      tags,
      readmeMarkdown: normalizedReadme,
      changelogMarkdown: changelog || undefined,
      contributes,
      installed: false,
      enabled: true,
      source: 'marketplace',
    };

    return detail;
  }

  /**
   * Fetch markdown string from remote URL (supports 302 redirects automatically via fetch)
   */
  private async fetchMarkdownContent(url: string): Promise<string> {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) {
        return await res.text();
      }
    } catch (err: any) {
      console.warn(`[ExtensionDetailService] Failed to fetch markdown from ${url}:`, err.message);
    }
    return '';
  }

  /**
   * Create minimal online fallback when Open VSX request fails
   */
  private createMinimalOnlineFallback(id: string): ExtensionDetailData {
    const { namespace, name } = this.parseExtensionId(id);
    return {
      id,
      name,
      namespace,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      version: '1.0.0',
      publisher: namespace,
      verified: false,
      description: `Extension ${id}`,
      downloads: 0,
      categories: ['Other'],
      tags: [],
      readmeMarkdown: `# ${name}\n\nUnable to retrieve extension details from the registry. Please check your internet connection.`,
      installed: false,
      enabled: true,
      source: 'marketplace',
    };
  }

  /**
   * Read locally installed extension from disk (package.json, README.md, CHANGELOG.md)
   */
  public async fetchLocalExtension(installedPath: string, baseManifest?: ExtensionManifest): Promise<ExtensionDetailData> {
    let rawPkg: any = {};
    const pkgPath = `${installedPath.replace(/\\/g, '/').replace(/\/+$/, '')}/package.json`;

    try {
      const fileRes = await api.readFile(pkgPath);
      if (fileRes && fileRes.content) {
        rawPkg = JSON.parse(fileRes.content);
      }
    } catch (err) {
      console.warn(`[ExtensionDetailService] Could not read local package.json at ${pkgPath}:`, err);
    }

    const publisher = rawPkg.publisher || baseManifest?.author || installedPath.split(/[/\\]/).pop()?.split('.')[0] || 'local';
    const name = rawPkg.name || baseManifest?.name || installedPath.split(/[/\\]/).pop() || 'extension';
    const id = `${publisher}.${name}`;
    const displayName = rawPkg.displayName || baseManifest?.displayName || name;
    const version = rawPkg.version || baseManifest?.version || '1.0.0';
    const description = rawPkg.description || baseManifest?.description || '';
    const license = rawPkg.license || undefined;
    const repository = typeof rawPkg.repository === 'string' ? rawPkg.repository : rawPkg.repository?.url;
    const homepage = rawPkg.homepage || undefined;
    const categories = Array.isArray(rawPkg.categories) ? rawPkg.categories : (baseManifest?.categories || ['Other']);
    const tags = Array.isArray(rawPkg.keywords) ? rawPkg.keywords : [];

    // Icon resolution
    let iconUrl = baseManifest?.icon;
    if (!iconUrl && rawPkg.icon) {
      const iconPath = `${installedPath.replace(/\\/g, '/').replace(/\/+$/, '')}/${rawPkg.icon.replace(/^\.?\/+/, '')}`;
      try {
        const imgRes = await api.readImage(iconPath);
        if (imgRes && imgRes.dataUrl) {
          iconUrl = imgRes.dataUrl;
        } else if (iconPath.toLowerCase().endsWith('.svg')) {
          const svgRes = await api.readFile(iconPath);
          if (svgRes && svgRes.content) {
            iconUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgRes.content)}`;
          }
        }
      } catch (err) {
        console.warn('[ExtensionDetailService] Failed to load extension icon:', err);
      }
    }
    if (iconUrl && iconUrl.trim().startsWith('<svg')) {
      iconUrl = `data:image/svg+xml;utf8,${encodeURIComponent(iconUrl.trim())}`;
    }

    // Read local README.md
    let readme = '';
    const readmeCandidates = ['README.md', 'readme.md', 'Readme.md', 'README.markdown'];
    for (const cand of readmeCandidates) {
      const rPath = `${installedPath.replace(/\\/g, '/').replace(/\/+$/, '')}/${cand}`;
      try {
        const rRes = await api.readFile(rPath);
        if (rRes && rRes.content) {
          readme = rRes.content;
          break;
        }
      } catch {}
    }

    if (!readme) {
      readme = `# ${displayName}\n\n${description || 'Local extension installed in your IDE.'}`;
    }

    // Normalize relative image URLs against local path or repository
    const rawBaseUrl = repository
      ? deriveRawBaseUrl(repository)
      : `file:///${installedPath.replace(/\\/g, '/').replace(/^\/+/, '')}/`;

    const normalizedReadme = normalizeReadmeImageUrls(readme, rawBaseUrl);

    // Read local CHANGELOG.md
    let changelog = '';
    const changelogCandidates = ['CHANGELOG.md', 'changelog.md', 'Changelog.md', 'CHANGES.md'];
    for (const cand of changelogCandidates) {
      const cPath = `${installedPath.replace(/\\/g, '/').replace(/\/+$/, '')}/${cand}`;
      try {
        const cRes = await api.readFile(cPath);
        if (cRes && cRes.content) {
          changelog = cRes.content;
          break;
        }
      } catch {}
    }

    const contributes: ExtensionContributions = rawPkg.contributes || baseManifest?.contributes || {};

    const detail: ExtensionDetailData = {
      id,
      name,
      namespace: publisher,
      displayName,
      version,
      publisher,
      publisherDisplayName: publisher,
      verified: false,
      description,
      license,
      repository,
      homepage,
      iconUrl,
      downloads: 0,
      categories,
      tags,
      readmeMarkdown: normalizedReadme,
      changelogMarkdown: changelog || undefined,
      contributes,
      installed: true,
      installedVersion: version,
      installedPath,
      enabled: baseManifest ? baseManifest.enabled : true,
      source: (baseManifest?.source as any) || 'binary',
    };

    return detail;
  }

  /**
   * Unified loader: checks if extension is installed locally,
   * otherwise fetches from Open VSX, or enriches local data with online downloads/ratings.
   */
  public async getExtensionDetail(
    id: string,
    options?: {
      installedPath?: string;
      localManifest?: ExtensionManifest;
      marketplaceItem?: MarketplaceExtensionItem;
      forceRefresh?: boolean;
    }
  ): Promise<ExtensionDetailData> {
    const cacheKey = id.toLowerCase();
    if (!options?.forceRefresh && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 1. Always check if we have an installed extension on disk
    let installedExt: ExtensionManifest | undefined = undefined;
    if (options?.localManifest && (options.localManifest as any).installedPath) {
      installedExt = options.localManifest;
    }

    try {
      const list = await api.listExtensions();
      const idLower = id.toLowerCase();
      const dotIdx = idLower.indexOf('.');
      const nameOnly = dotIdx !== -1 ? idLower.slice(dotIdx + 1) : idLower;

      const found = list.find((e) => {
        const eId = (e.id || '').toLowerCase();
        const eName = (e.name || '').toLowerCase();
        const eDot = eId.indexOf('.');
        const eNameOnly = eDot !== -1 ? eId.slice(eDot + 1) : eId;
        return (
          eId === idLower ||
          eName === idLower ||
          eName === nameOnly ||
          eNameOnly === nameOnly ||
          eId.endsWith(`.${nameOnly}`) ||
          (e.installedPath && e.installedPath.toLowerCase().includes(nameOnly))
        );
      });

      if (found) {
        installedExt = found;
      }
    } catch {}

    let detail: ExtensionDetailData;

    if (installedExt && installedExt.installedPath) {
      // It's installed locally!
      detail = await this.fetchLocalExtension(installedExt.installedPath, installedExt);
      detail.installed = true;
      detail.enabled = installedExt.enabled;

      // Opportunistically fetch online stats (downloads, ratings, verified badge, repo)
      try {
        const online = await this.fetchOnlineExtension(id);
        if (online && online.downloads > 0) {
          detail.downloads = online.downloads;
          detail.rating = online.rating;
          detail.reviewCount = online.reviewCount;
          detail.verified = online.verified;
          if (!detail.repository && online.repository) detail.repository = online.repository;
          if (!detail.license && online.license) detail.license = online.license;
          if (!detail.changelogMarkdown && online.changelogMarkdown) detail.changelogMarkdown = online.changelogMarkdown;
        }
      } catch {
        // Non-fatal
      }
    } else {
      // It's an online marketplace extension
      detail = await this.fetchOnlineExtension(id);
      if (options?.marketplaceItem) {
        if (options.marketplaceItem.downloadCount) detail.downloads = options.marketplaceItem.downloadCount;
        if (options.marketplaceItem.rating) detail.rating = options.marketplaceItem.rating;
        if (options.marketplaceItem.icon && !detail.iconUrl) detail.iconUrl = options.marketplaceItem.icon;
        if (options.marketplaceItem.downloadUrl && !detail.downloadUrl) detail.downloadUrl = options.marketplaceItem.downloadUrl;
        if (options.marketplaceItem.installed) detail.installed = true;
      }
      if (installedExt) {
        detail.installed = true;
        detail.enabled = installedExt.enabled;
        detail.installedVersion = installedExt.version;
        if (installedExt.installedPath) detail.installedPath = installedExt.installedPath;
      }
    }

    this.cache.set(cacheKey, detail);
    return detail;
  }

  /**
   * Clears cached details for an extension (e.g. after install or uninstall)
   */
  public invalidateCache(id?: string) {
    if (id) {
      this.cache.delete(id.toLowerCase());
    } else {
      this.cache.clear();
    }
  }
}

export const extensionDetailService = new ExtensionDetailService();
