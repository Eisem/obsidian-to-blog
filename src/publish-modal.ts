import { App, Modal, Setting, TFile } from "obsidian";
import type PublishToBlogPlugin from "./main";
import { getTagList } from "./hexo-utils";

export class PublishModal extends Modal {
  plugin: PublishToBlogPlugin;
  file: TFile;

  private obsidianTags: string[];
  private recentBlogTags: string[];

  constructor(app: App, plugin: PublishToBlogPlugin, file: TFile) {
    super(app);
    this.plugin = plugin;
    this.file = file;

    const cache = app.metadataCache.getFileCache(file);
    this.obsidianTags = extractObsidianTags(cache);
    this.recentBlogTags = this.loadRecentBlogTags();
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("publish-modal");

    contentEl.createEl("h2", { text: "Publish Post" });

    const cache = this.app.metadataCache.getFileCache(this.file);
    const titleFromFm = cache?.frontmatter?.title || "";

    let titleValue = titleFromFm || this.file.basename;

    const existingBlogTags: string[] = normalizeArray(
      cache?.frontmatter?.tags
    );
    const mergedTags = dedupe([...this.obsidianTags, ...existingBlogTags]);
    let tagsValue = mergedTags.join(", ");

    new Setting(contentEl)
      .setName("Title")
      .addText((text) => {
        text
          .setPlaceholder("Post title")
          .setValue(titleValue)
          .onChange((v) => (titleValue = v));
        text.inputEl.style.width = "100%";
      });

    new Setting(contentEl)
      .setName("Tags")
      .setDesc("Comma-separated")
      .addText((text) => {
        text
          .setPlaceholder("javascript, tutorial")
          .setValue(tagsValue)
          .onChange((v) => {
            tagsValue = v;
            this.refreshChips(contentEl, tagsValue);
          });
        text.inputEl.style.width = "100%";
        (contentEl as any)._tagInput = text.inputEl;
      });

    if (this.obsidianTags.length > 0) {
      const fromNote = contentEl.createEl("div", {
        cls: "publish-modal-section",
      });
      fromNote.createEl("div", {
        cls: "publish-modal-section-label",
        text: "Tags from this note",
      });
      const chips = fromNote.createEl("div", {
        cls: "publish-modal-chips",
      });
      for (const tag of this.obsidianTags) {
        this.createTagChip(chips, tag, "obsidian", () => {
          tagsValue = removeTagFromText(tagsValue, tag);
          const input = (contentEl as any)._tagInput as HTMLInputElement;
          if (input) {
            input.value = tagsValue;
            input.dispatchEvent(new Event("input"));
          }
        });
      }
    }

    if (this.recentBlogTags.length > 0) {
      const fromBlog = contentEl.createEl("div", {
        cls: "publish-modal-section",
      });
      fromBlog.createEl("div", {
        cls: "publish-modal-section-label",
        text: "Recently used blog tags",
      });
      const chips = fromBlog.createEl("div", {
        cls: "publish-modal-chips",
      });
      for (const tag of this.recentBlogTags.slice(0, 30)) {
        this.createTagChip(chips, tag, "recent", () => {
          tagsValue = toggleTagInText(tagsValue, tag);
          const input = (contentEl as any)._tagInput as HTMLInputElement;
          if (input) {
            input.value = tagsValue;
            input.dispatchEvent(new Event("input"));
          }
        });
      }
    }

    const buttons = contentEl.createEl("div", {
      cls: "publish-modal-buttons",
    });

    const cancelBtn = buttons.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());

    const publishBtn = buttons.createEl("button", {
      cls: "mod-cta",
      text: "Publish",
    });
    publishBtn.addEventListener("click", async () => {
      publishBtn.disabled = true;
      publishBtn.setText("Publishing...");

      const finalTags = splitTrim(tagsValue);

      await this.app.fileManager.processFrontMatter(this.file, (fm) => {
        fm["title"] = titleValue.trim() || undefined;
        fm["tags"] = finalTags.length > 0 ? finalTags : undefined;
        fm["publish"] = true;
      });

      this.plugin.syncSingleFile(this.file);
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private loadRecentBlogTags(): string[] {
    const blogPath = this.plugin.settings.blogFolderPath.trim();
    if (!blogPath) return [];
    return getTagList(blogPath)
      .map((item) => item.name)
      .filter(Boolean);
  }

  private createTagChip(
    parent: HTMLElement,
    tag: string,
    type: "obsidian" | "recent",
    onClick: () => void
  ) {
    const chip = parent.createEl("span", { cls: "publish-modal-chip" });
    chip.setText(tag);
    if (type === "obsidian") chip.addClass("is-obsidian");
    chip.addEventListener("click", onClick);
  }

  private refreshChips(container: HTMLElement, currentTags: string) {
    const currentSet = new Set(splitTrim(currentTags));
    const chips = container.findAll(
      ".publish-modal-chip:not(.is-obsidian)"
    ) as HTMLElement[];
    for (const chip of chips) {
      if (currentSet.has(chip.getText())) {
        chip.addClass("is-selected");
      } else {
        chip.removeClass("is-selected");
      }
    }
  }
}

function extractObsidianTags(cache: any): string[] {
  const tags = new Set<string>();
  if (cache?.frontmatter?.tags) {
    for (const t of normalizeArray(cache.frontmatter.tags)) {
      tags.add(t.startsWith("#") ? t.slice(1) : t);
    }
  }
  if (cache?.tags) {
    for (const item of cache.tags) {
      const raw = item.tag || "";
      if (raw.startsWith("#")) {
        tags.add(raw.slice(1));
      }
    }
  }
  return [...tags];
}

function normalizeArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === "string") return [value];
  return [];
}

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

function splitTrim(input: string): string[] {
  return input
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function removeTagFromText(text: string, tag: string): string {
  const current = splitTrim(text);
  const filtered = current.filter((t) => t !== tag);
  return filtered.join(", ");
}

function toggleTagInText(text: string, tag: string): string {
  const current = splitTrim(text);
  if (current.includes(tag)) {
    return current.filter((t) => t !== tag).join(", ");
  }
  return [...current, tag].join(", ");
}
