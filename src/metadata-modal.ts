import { App, Modal, Setting, TFile } from "obsidian";
import type PublishToBlogPlugin from "./main";

export class MetadataModal extends Modal {
  plugin: PublishToBlogPlugin;
  file: TFile;

  private existingTitle: string;
  private existingCategories: string[];
  private existingTags: string[];

  constructor(app: App, plugin: PublishToBlogPlugin, file: TFile) {
    super(app);
    this.plugin = plugin;
    this.file = file;

    const fm = app.metadataCache.getFileCache(file)?.frontmatter;
    this.existingTitle = fm?.title || "";
    this.existingCategories = normalizeArray(fm?.categories);
    this.existingTags = normalizeArray(fm?.tags);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("metadata-modal");

    contentEl.createEl("h2", { text: "Edit Post Metadata" });

    let titleValue = this.existingTitle;
    let categoriesValue = this.existingCategories.join(", ");
    let tagsValue = this.existingTags.join(", ");

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
      .setName("Categories")
      .setDesc("Comma-separated")
      .addText((text) => {
        text
          .setPlaceholder("技术, 前端")
          .setValue(categoriesValue)
          .onChange((v) => (categoriesValue = v));
        text.inputEl.style.width = "100%";
      });

    new Setting(contentEl)
      .setName("Tags")
      .setDesc("Comma-separated")
      .addText((text) => {
        text
          .setPlaceholder("javascript, tutorial")
          .setValue(tagsValue)
          .onChange((v) => (tagsValue = v));
        text.inputEl.style.width = "100%";
      });

    const buttons = contentEl.createEl("div", { cls: "metadata-modal-buttons" });

    const cancelBtn = buttons.createEl("button", { text: "Cancel" });
    cancelBtn.addEventListener("click", () => this.close());

    const saveBtn = buttons.createEl("button", {
      cls: "mod-cta",
      text: "Save & Sync",
    });
    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      saveBtn.setText("Saving...");

      const newCategories = splitTrim(categoriesValue);
      const newTags = splitTrim(tagsValue);

      await this.app.fileManager.processFrontMatter(this.file, (fm) => {
        fm["title"] = titleValue.trim() || undefined;
        fm["categories"] = newCategories.length > 0 ? newCategories : undefined;
        fm["tags"] = newTags.length > 0 ? newTags : undefined;
      });

      this.plugin.syncSingleFile(this.file);
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

function normalizeArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return [];
}

function splitTrim(input: string): string[] {
  return input
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
