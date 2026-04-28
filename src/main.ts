import { exec } from "child_process";
import { Notice, Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS, PublishSettingTab, type PluginSettings } from "./settings";
import * as fs from "fs";
import * as path from "path";

export default class PublishToBlogPlugin extends Plugin {
  settings: PluginSettings;
  private syncTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private deployTimer: ReturnType<typeof setTimeout> | null = null;
  private isDeploying = false;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new PublishSettingTab(this.app, this));

    this.addCommand({
      id: "toggle-publish",
      name: "Toggle publish for current note",
      editorCheckCallback: (checking, _editor, ctx) => {
        const file = ctx.file;
        if (!(file instanceof TFile) || file.extension !== "md") return false;
        if (!checking) {
          this.togglePublish(file);
        }
        return true;
      },
    });

    this.addCommand({
      id: "sync-all-published",
      name: "Sync all published notes to blog",
      callback: () => this.syncAllPublished(),
    });

    this.addCommand({
      id: "sync-current-file",
      name: "Sync current note to blog",
      callback: () => {
        const file = this.app.workspace.getActiveFile();
        if (file instanceof TFile && file.extension === "md") {
          this.syncSingleFile(file);
        } else {
          new Notice("No active markdown file to sync.");
        }
      },
    });

    this.addCommand({
      id: "deploy-now",
      name: "Deploy blog now",
      callback: () => {
        if (this.deployTimer) {
          clearTimeout(this.deployTimer);
          this.deployTimer = null;
        }
        this.runDeploy();
      },
    });

    this.addRibbonIcon("send", "Sync all published notes to blog", () => {
      this.syncAllPublished();
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile) || file.extension !== "md") return;
        const published = this.isPublished(file);
        menu.addItem((item) => {
          item
            .setTitle(published ? "Unmark as publish" : "Mark as publish")
            .setIcon(published ? "bookmark" : "bookmark-plus")
            .onClick(() => this.togglePublish(file));
        });
      })
    );

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        this.debouncedAutoSync(file);
      })
    );

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile) {
          this.debouncedAutoSync(file);
        }
      })
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  isPublished(file: TFile): boolean {
    const cache = this.app.metadataCache.getFileCache(file);
    const publish = cache?.frontmatter?.publish;
    return publish === true;
  }

  async togglePublish(file: TFile) {
    const current = this.isPublished(file);
    const next = !current;
    await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter["publish"] = next;
    });
    new Notice(`Marked as ${next ? "publish" : "private"}: ${file.basename}`);
    if (next && this.settings.autoSync) {
      this.syncSingleFile(file);
    }
  }

  private debouncedAutoSync(file: TFile) {
    if (!this.settings.autoSync) return;
    if (!this.isPublished(file)) return;

    const key = file.path;
    const existing = this.syncTimers.get(key);
    if (existing) clearTimeout(existing);
    this.syncTimers.set(
      key,
      setTimeout(() => {
        this.syncTimers.delete(key);
        this.syncSingleFile(file);
      }, 800)
    );
  }

  async syncSingleFile(file: TFile) {
    const blogPath = this.settings.blogFolderPath.trim();
    if (!blogPath) {
      new Notice("Blog folder path is not configured. Check plugin settings.");
      return;
    }

    try {
      const content = await this.app.vault.read(file);
      const targetPath = path.join(
        blogPath.replace(/[/\\]$/, ""),
        file.path
      );
      const targetDir = path.dirname(targetPath);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(targetPath, content, "utf-8");
      new Notice(`Synced to blog: ${file.path}`);
      if (this.settings.autoDeploy) this.resetDeployTimer();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      new Notice(`Sync failed: ${file.basename}. ${msg}`);
      console.error("PublishToBlog sync error:", e);
    }
  }

  async syncAllPublished() {
    const blogPath = this.settings.blogFolderPath.trim();
    if (!blogPath) {
      new Notice("Blog folder path is not configured. Check plugin settings.");
      return;
    }

    const files = this.app.vault.getMarkdownFiles();
    let synced = 0;
    let errors = 0;

    for (const file of files) {
      if (this.isPublished(file)) {
        try {
          await this.syncSingleFile(file);
          synced++;
        } catch {
          errors++;
        }
      }
    }

    new Notice(`Sync complete: ${synced} synced${errors > 0 ? `, ${errors} errors` : ""}`);
  }

  private resetDeployTimer() {
    if (this.deployTimer) clearTimeout(this.deployTimer);
    this.deployTimer = setTimeout(() => {
      this.deployTimer = null;
      this.runDeploy();
    }, this.settings.bufferMinutes * 60 * 1000);
  }

  private runDeploy() {
    if (this.isDeploying) {
      console.log("PublishToBlog: Deploy already in progress, skipping.");
      return;
    }

    const hexoRoot = this.settings.hexoRootPath.trim();
    const cmd = this.settings.deployCommand.trim();

    if (!hexoRoot || !cmd) {
      new Notice("Hexo root path or deploy command not configured. Check plugin settings.");
      return;
    }

    if (!fs.existsSync(hexoRoot)) {
      new Notice(`Hexo root path does not exist: ${hexoRoot}`);
      return;
    }

    this.isDeploying = true;
    new Notice(`Deploy started: ${cmd}`);

    exec(cmd, { cwd: hexoRoot }, (error, stdout, stderr) => {
      this.isDeploying = false;
      if (error) {
        new Notice(`Deploy failed: ${error.message}`);
        console.error("PublishToBlog deploy error stdout:", stdout);
        console.error("PublishToBlog deploy error stderr:", stderr);
      } else {
        new Notice("Deploy completed successfully!");
        if (stdout) console.log("PublishToBlog deploy stdout:", stdout);
      }
    });
  }

  onunload() {
    this.syncTimers.forEach((t) => clearTimeout(t));
    this.syncTimers.clear();
    if (this.deployTimer) clearTimeout(this.deployTimer);
  }
}
