import { parseYaml } from "obsidian";
import * as fs from "fs";
import * as path from "path";

export interface HexoPostInfo {
  title: string;
  date: string;
  categories: string[];
  tags: string[];
  filePath: string;
  fileName: string;
}

export interface BlogStats {
  totalPosts: number;
  totalCategories: number;
  totalTags: number;
}

export interface CategoryInfo {
  name: string;
  count: number;
}

export interface TagInfo {
  name: string;
  count: number;
}

function parseFrontmatter(content: string): Record<string, any> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    return parseYaml(match[1]) || {};
  } catch {
    return null;
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string") return [value];
  if (typeof value === "object" && value !== null) {
    if (Array.isArray((value as Record<string, unknown>).map)) {
      return (value as { map: unknown[] }).map.map((v) => String(v));
    }
    return [];
  }
  return [];
}

export function scanPosts(blogFolderPath: string): HexoPostInfo[] {
  const postsDir = path.resolve(blogFolderPath);
  if (!fs.existsSync(postsDir)) return [];

  const posts: HexoPostInfo[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".md")) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const fm = parseFrontmatter(content);
          if (fm) {
            posts.push({
              title: fm.title || entry.name.replace(".md", ""),
              date: fm.date || "",
              categories: normalizeStringArray(fm.categories),
              tags: normalizeStringArray(fm.tags),
              filePath: path
                .relative(blogFolderPath, fullPath)
                .replace(/\\/g, "/"),
              fileName: entry.name,
            });
          }
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  walk(postsDir);
  posts.sort((a, b) => b.date.localeCompare(a.date));
  return posts;
}

export function getBlogStats(blogFolderPath: string): BlogStats {
  const posts = scanPosts(blogFolderPath);
  const categories = new Set<string>();
  const tags = new Set<string>();

  for (const post of posts) {
    for (const cat of post.categories) categories.add(cat);
    for (const tag of post.tags) tags.add(tag);
  }

  return {
    totalPosts: posts.length,
    totalCategories: categories.size,
    totalTags: tags.size,
  };
}

export function getCategoryList(blogFolderPath: string): CategoryInfo[] {
  const posts = scanPosts(blogFolderPath);
  const map = new Map<string, number>();

  for (const post of posts) {
    for (const cat of post.categories) {
      map.set(cat, (map.get(cat) || 0) + 1);
    }
  }

  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getTagList(blogFolderPath: string): TagInfo[] {
  const posts = scanPosts(blogFolderPath);
  const map = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.tags) {
      map.set(tag, (map.get(tag) || 0) + 1);
    }
  }

  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getFilesWithTag(
  blogFolderPath: string,
  tag: string
): HexoPostInfo[] {
  return scanPosts(blogFolderPath).filter((p) => p.tags.includes(tag));
}
