// Hand-written types for scan.mjs, so tests/icons.test.ts can import the same scanner the generator uses instead of keeping a second copy of the regex.

export declare const REPO_ROOT: string;
export declare const FA_CSS: string;
export declare const FA_SOLID_WOFF2: string;
export declare const OUT_CSS: string;
export declare const OUT_FONT: string;
export declare const OUT_MANIFEST: string;
export declare const NON_ICON_CLASSES: Set<string>;

export declare function sourceFiles(): string[];
export declare function scanIconUsage(): Map<string, string[]>;
export declare function faCodepoints(): Map<string, string>;
export declare function resolveIcons(): {
  resolved: Map<string, string>;
  missing: Map<string, string[]>;
  glyphs: string[];
};
