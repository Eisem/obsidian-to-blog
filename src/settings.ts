import { App, PluginSettingTab, Setting } from "obsidian";
import type PublishToBlogPlugin from "./main";

export interface PluginSettings {
  blogFolderPath: string;
  autoSync: boolean;
  hexoRootPath: string;
  deployCommand: string;
  bufferMinutes: number;
  autoDeploy: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  blogFolderPath: "",
  autoSync: true,
  hexoRootPath: "",
  deployCommand: "hexo g -d",
  bufferMinutes: 5,
  autoDeploy: false,
};

export class PublishSettingTab extends PluginSettingTab {
  plugin: PublishToBlogPlugin;

  constructor(app: App, plugin: PublishToBlogPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Publish to Blog Settings" });

    new Setting(containerEl)
      .setName("Blog folder path")
      .setDesc("Absolute path to your blog posts folder (e.g. D:/my-blog/posts/)")
      .addText((text) =>
        text
          .setPlaceholder("D:/my-blog/posts/")
          .setValue(this.plugin.settings.blogFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.blogFolderPath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto sync on save")
      .setDesc("Automatically copy the note to the blog folder when a publish-marked file is saved.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoSync)
          .onChange(async (value) => {
            this.plugin.settings.autoSync = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Deployment" });

    new Setting(containerEl)
      .setName("Auto deploy")
      .setDesc("Automatically run the deploy command after a period of no changes.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoDeploy)
          .onChange(async (value) => {
            this.plugin.settings.autoDeploy = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Hexo root path")
      .setDesc("Absolute path to your Hexo project root (where _config.yml lives).")
      .addText((text) =>
        text
          .setPlaceholder("D:/my-blog/")
          .setValue(this.plugin.settings.hexoRootPath)
          .onChange(async (value) => {
            this.plugin.settings.hexoRootPath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Deploy command")
      .setDesc("Command to build and deploy your blog (runs in Hexo root directory).")
      .addText((text) =>
        text
          .setPlaceholder("hexo g -d")
          .setValue(this.plugin.settings.deployCommand)
          .onChange(async (value) => {
            this.plugin.settings.deployCommand = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Buffer time (minutes)")
      .setDesc("Minutes to wait after the last change before auto-deploy fires.")
      .addSlider((slider) =>
        slider
          .setLimits(1, 60, 1)
          .setValue(this.plugin.settings.bufferMinutes)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.bufferMinutes = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
