import { ItemView, WorkspaceLeaf } from "obsidian";
import type PublishToBlogPlugin from "./main";
import {
  getBlogStats,
  getCategoryList,
  getTagList,
  scanPosts,
  type CategoryInfo,
  type TagInfo,
} from "./hexo-utils";
import * as fs from "fs";

export const VIEW_TYPE_DASHBOARD = "obsidian-to-blog-dashboard";

export class DashboardView extends ItemView {
  plugin: PublishToBlogPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: PublishToBlogPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_DASHBOARD;
  }

  getDisplayText(): string {
    return "Blog Dashboard";
  }

  getIcon(): string {
    return "bar-chart-2";
  }

  async onOpen() {
    this.render();
  }

  async onClose() {
    // cleanup if needed
  }

  render() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("blog-dashboard");

    const blogPath = this.plugin.settings.blogFolderPath.trim();
    if (!blogPath || !fs.existsSync(blogPath)) {
      container.createEl("div", {
        cls: "blog-dashboard-empty",
        text: "Blog folder path not configured or does not exist.\nGo to plugin settings to configure.",
      });
      return;
    }

    const stats = getBlogStats(blogPath);
    const recentPosts = scanPosts(blogPath).slice(0, 10);
    const categories = getCategoryList(blogPath);
    const tags = getTagList(blogPath);

    // Header
    const header = container.createEl("div", { cls: "blog-dashboard-header" });
    header.createEl("h2", { text: "Blog Dashboard" });

    // Refresh button
    const refreshBtn = header.createEl("button", {
      cls: "blog-dashboard-refresh",
      text: "Refresh",
    });
    refreshBtn.addEventListener("click", () => this.render());

    // Stats row
    const statsRow = container.createEl("div", { cls: "blog-stats-row" });
    this.createStatCard(statsRow, "Posts", String(stats.totalPosts));
    this.createStatCard(statsRow, "Categories", String(stats.totalCategories));
    this.createStatCard(statsRow, "Tags", String(stats.totalTags));

    // Quick actions
    const actions = container.createEl("div", { cls: "blog-actions" });
    actions.createEl("h4", { text: "Quick Actions" });
    const actionsRow = actions.createEl("div", { cls: "blog-actions-row" });
    this.createActionButton(actionsRow, "Generate & Deploy", () => {
      this.plugin.cancelDeployTimer();
      this.plugin.runDeploy();
    });
    this.createActionButton(actionsRow, "Sync All", () => {
      this.plugin.syncAllPublished();
    });

    // Recent posts
    const recentSection = container.createEl("div", {
      cls: "blog-section",
    });
    recentSection.createEl("h4", { text: "Recent Posts" });
    if (recentPosts.length === 0) {
      recentSection.createEl("div", {
        cls: "blog-empty-hint",
        text: "No posts found.",
      });
    } else {
      const list = recentSection.createEl("div", { cls: "blog-post-list" });
      for (const post of recentPosts) {
        const item = list.createEl("div", { cls: "blog-post-item" });
        const meta = item.createEl("span", { cls: "blog-post-date" });
        meta.setText(post.date ? post.date.slice(0, 10) : "");
        item.createEl("span", { cls: "blog-post-title", text: post.title });
      }
    }

    // Categories
    const catSection = container.createEl("div", { cls: "blog-section" });
    catSection.createEl("h4", { text: "Categories" });
    if (categories.length === 0) {
      catSection.createEl("div", {
        cls: "blog-empty-hint",
        text: "No categories.",
      });
    } else {
      this.renderCategoryTagList(catSection, categories, "category");
    }

    // Tags
    const tagSection = container.createEl("div", { cls: "blog-section" });
    tagSection.createEl("h4", { text: "Tags" });
    if (tags.length === 0) {
      tagSection.createEl("div", {
        cls: "blog-empty-hint",
        text: "No tags.",
      });
    } else {
      this.renderTagList(tagSection, tags, blogPath);
    }
  }

  private createStatCard(
    parent: HTMLElement,
    label: string,
    value: string
  ) {
    const card = parent.createEl("div", { cls: "blog-stat-card" });
    card.createEl("div", { cls: "blog-stat-value", text: value });
    card.createEl("div", { cls: "blog-stat-label", text: label });
  }

  private createActionButton(
    parent: HTMLElement,
    text: string,
    onClick: () => void
  ) {
    const btn = parent.createEl("button", { cls: "blog-action-btn", text });
    btn.addEventListener("click", onClick);
  }

  private renderCategoryTagList(
    parent: HTMLElement,
    items: CategoryInfo[] | TagInfo[],
    type: "category" | "tag"
  ) {
    const container = parent.createEl("div", { cls: "blog-chips" });
    for (const item of items) {
      const chip = container.createEl("span", { cls: "blog-chip" });
      const icon = type === "category" ? "📂" : "🏷";
      chip.setText(`${icon} ${item.name} (${item.count})`);
    }
  }

  private renderTagList(
    parent: HTMLElement,
    items: TagInfo[],
    blogPath: string
  ) {
    const container = parent.createEl("div", { cls: "blog-chips" });
    for (const item of items) {
      const chip = container.createEl("span", { cls: "blog-chip blog-tag-chip" });
      chip.createEl("span", { cls: "blog-tag-name", text: `🏷 ${item.name}` });
      chip.createEl("span", { cls: "blog-tag-count", text: String(item.count) });

      const delBtn = chip.createEl("span", { cls: "blog-tag-delete" });
      delBtn.setText("×");
      delBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const confirmed = confirm(
          `Remove tag "${item.name}" from ${item.count} posts?`
        );
        if (!confirmed) return;

        delBtn.setText("⏳");
        await this.plugin.removeTagFromAllPosts(item.name);
        this.render();
      });
    }
  }
}
