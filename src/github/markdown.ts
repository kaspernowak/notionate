import { promises as fs } from 'fs';
import path from 'path';
import { markdownToBlocks } from '@tryfabric/martian';
import * as core from '@actions/core';
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { DirectoryContent, MarkdownFile } from '../types/markdown';

export class MarkdownProcessor {
  async processDirectory(dirPath: string): Promise<DirectoryContent> {
    core.debug(`Processing directory: ${dirPath}`);
    const content: DirectoryContent = {
      files: [],
      directories: [],
    };

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      core.debug(`Found ${items.length} items in directory`);

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          core.debug(`Found directory: ${item.name}`);
          content.directories.push(fullPath);
          // Recursively process subdirectories
          const subContent = await this.processDirectory(fullPath);
          core.debug(`Subdirectory ${item.name} contained ${subContent.files.length} markdown files`);
          content.files.push(...subContent.files);
          if (subContent.readme) {
            core.debug(`Found README in subdirectory ${item.name}`);
            content.files.push(subContent.readme);
          }
        } else if (item.isFile() && item.name.toLowerCase().endsWith('.md')) {
          core.debug(`Found markdown file: ${item.name}`);
          const file = await this.processFile(fullPath);
          if (item.name.toLowerCase() === 'readme.md') {
            core.debug(`Processing as README: ${item.name}`);
            content.readme = file;
          } else {
            core.debug(`Processing as regular markdown: ${item.name}`);
            content.files.push(file);
          }
        } else {
          core.debug(`Skipping non-markdown file: ${item.name}`);
        }
      }

      core.debug(`Directory ${dirPath} processing complete. Found ${content.files.length} files${content.readme ? ' (plus README)' : ''}`);
    } catch (error) {
      core.error(`Error processing directory ${dirPath}: ${error}`);
      throw error;
    }

    return content;
  }

  /**
   * Process a markdown file and convert it to Notion blocks
   */
  async processMarkdown(filePath: string): Promise<BlockObjectRequest[]> {
    core.debug(`Converting markdown to blocks: ${filePath}`);
    const file = await this.processFile(filePath);
    // Martian's blocks are compatible with Notion's API at runtime
    const blocks = markdownToBlocks(file.content) as BlockObjectRequest[];
    core.debug(`Converted ${filePath} to ${blocks.length} blocks`);
    return blocks;
  }

  private async processFile(filePath: string): Promise<MarkdownFile> {
    try {
      core.debug(`Reading file: ${filePath}`);
      const content = await fs.readFile(filePath, 'utf-8');
      const title = this.getTitle(filePath);
      core.debug(`File ${filePath} processed with title: ${title}`);
      
      return {
        path: filePath,
        content,
        relativePath: path.relative(process.cwd(), filePath),
        title,
      };
    } catch (error) {
      core.error(`Error processing file ${filePath}: ${error}`);
      throw error;
    }
  }

  private getTitle(filePath: string): string {
    const basename = path.basename(filePath, '.md');
    return basename === 'README' || basename === 'readme' 
      ? path.basename(path.dirname(filePath))
      : basename;
  }
}
