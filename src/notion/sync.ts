import * as core from '@actions/core';
import { NotionClient } from './api/client';
import { ActionInputs, SyncResult } from '../types/notion';
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { MarkdownProcessor } from '../github/markdown';
import { BlockComparator } from './blocks/comparator';

/**
 * Service responsible for syncing markdown content to Notion
 */
export class SyncService {
  private markdownProcessor: MarkdownProcessor;
  private destinationCache: Map<string, string> = new Map(); // path -> destinationId

  constructor(
    private client: NotionClient,
    private comparator: BlockComparator
  ) {
    this.markdownProcessor = new MarkdownProcessor();
  }

  async sync(config: Omit<ActionInputs, 'notion_token'>): Promise<SyncResult> {
    const result: SyncResult = {
      status: 'success',
      updated_pages: [],
      errors: []
    };

    try {
      const content = await this.markdownProcessor.processDirectory(config.source);
      core.info(`Found ${content.files.length} markdown files to process`);

      // Handle README/root first if it exists
      if (content.readme) {
        const blocks = await this.markdownProcessor.processMarkdown(content.readme.path);
        await this.syncDestination(config.destination_id, content.readme.title, blocks);
        result.updated_pages.push(config.destination_id);
      }

      // Process remaining files
      for (const file of content.files) {
        try {
          core.info(`Processing ${file.relativePath}...`);
          const blocks = await this.markdownProcessor.processMarkdown(file.path);
          const destinationId = await this.getDestinationId(config, file.title);
          await this.syncDestination(destinationId, file.title, blocks);
          result.updated_pages.push(destinationId);
        } catch (error) {
          core.error(`Failed to process ${file.path}: ${error}`);
          result.errors?.push(`Failed to process ${file.path}: ${error}`);
          result.status = 'partial';
        }
      }
    } catch (error) {
      core.error(`Sync failed: ${error}`);
      return {
        status: 'failed',
        updated_pages: result.updated_pages,
        errors: [`Sync failed: ${error}`],
      };
    }

    return result;
  }

  /**
   * Synchronizes markdown content to a Notion destination
   */
  async syncDestination(destinationId: string, title: string, blocks: BlockObjectRequest[]): Promise<void> {
    const existingBlocks = await this.client.getBlockChildren(destinationId);
    let currentNotionIndex = 0;
    let previousBlockId = destinationId;
    let pendingAppends: BlockObjectRequest[] = [];

    // Process each markdown block
    for (let mdIndex = 0; mdIndex < blocks.length; mdIndex++) {
      const markdownBlock = blocks[mdIndex];
      let blockMatched = false;

      // If we've processed all Notion blocks, append remaining markdown blocks
      if (currentNotionIndex >= existingBlocks.length) {
        pendingAppends.push(markdownBlock);
        continue;
      }

      // Try to find matching block at current position
      while (currentNotionIndex < existingBlocks.length && !blockMatched) {
        const notionBlock = existingBlocks[currentNotionIndex];

        // Check if blocks at current position are identical
        if (this.comparator.compare(markdownBlock, notionBlock)) {
          // Found exact match at current position
          if (pendingAppends.length > 0) {
            // Append any pending blocks before this match
            const chunks = this.chunkBlocks(pendingAppends);
            for (const chunk of chunks) {
              await this.client.appendBlocks(previousBlockId, chunk);
            }
            pendingAppends = [];
          }
          previousBlockId = notionBlock.id;
          currentNotionIndex++;
          blockMatched = true;
          break;
        }

        // Check if current Notion block has a match later in markdown
        const hasLaterMatch = blocks.slice(mdIndex + 1).some(
          laterBlock => this.comparator.compare(laterBlock, notionBlock)
        );

        if (!hasLaterMatch) {
          // No match found later, delete this block
          await this.client.deleteBlock(notionBlock.id);
          currentNotionIndex++;
        } else {
          // Match found later, append current markdown block
          pendingAppends.push(markdownBlock);
          break;
        }
      }

      if (!blockMatched && currentNotionIndex >= existingBlocks.length) {
        pendingAppends.push(markdownBlock);
      }
    }

    // Append any remaining blocks
    if (pendingAppends.length > 0) {
      const chunks = this.chunkBlocks(pendingAppends);
      for (const chunk of chunks) {
        await this.client.appendBlocks(previousBlockId, chunk);
      }
    }

    // Delete any remaining Notion blocks that weren't matched
    while (currentNotionIndex < existingBlocks.length) {
      await this.client.deleteBlock(existingBlocks[currentNotionIndex].id);
      currentNotionIndex++;
    }

    // Update title if needed
    await this.client.updatePage(destinationId, title);
  }

  /**
   * Split blocks into chunks for batch processing
   */
  private chunkBlocks(blocks: BlockObjectRequest[], size = 100): BlockObjectRequest[][] {
    const chunks: BlockObjectRequest[][] = [];
    for (let i = 0; i < blocks.length; i += size) {
      chunks.push(blocks.slice(i, i + size));
    }
    return chunks;
  }

  private async getDestinationId(config: Omit<ActionInputs, 'notion_token'>, title: string): Promise<string> {
    // Get or create destination ID for this file
    let destinationId = this.destinationCache.get(title);
    if (!destinationId) {
      destinationId = await this.client.createPage(config.destination_id, title, []);
      this.destinationCache.set(title, destinationId);
    }
    return destinationId;
  }
}
