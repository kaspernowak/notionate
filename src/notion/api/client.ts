import { Client, APIErrorCode, APIResponseError } from '@notionhq/client';
import { 
  BlockObjectRequest, 
  BlockObjectResponse, 
  PartialBlockObjectResponse,
  GetPageResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { RateLimiter } from './rate-limiter';

/**
 * Low-level client for interacting with Notion API
 */
export class NotionClient {
  private client: Client;
  private rateLimiter: RateLimiter;

  constructor(token: string) {
    this.client = new Client({ auth: token });
    this.rateLimiter = new RateLimiter(334); // ~3 requests per second
  }

  private isFullBlock(block: BlockObjectResponse | PartialBlockObjectResponse): block is BlockObjectResponse {
    return 'type' in block;
  }

  private chunkBlocks(blocks: BlockObjectRequest[], size = 100): BlockObjectRequest[][] {
    const chunks: BlockObjectRequest[][] = [];
    for (let i = 0; i < blocks.length; i += size) {
      chunks.push(blocks.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get all child blocks for a given block ID
   */
  async getBlockChildren(blockId: string): Promise<BlockObjectResponse[]> {
    try {
      const blocks: BlockObjectResponse[] = [];
      let cursor: string | undefined;

      do {
        await this.rateLimiter.wait();
        const response = await this.client.blocks.children.list({
          block_id: blockId,
          start_cursor: cursor,
        });

        blocks.push(...response.results.filter(this.isFullBlock));
        cursor = response.next_cursor ?? undefined;
      } while (cursor);

      return blocks;
    } catch (error) {
      if (error instanceof APIResponseError) {
        throw new Error(`Failed to get block children for ${blockId}: ${error.code}`);
      }
      throw new Error(`Failed to get block children for ${blockId}: ${error}`);
    }
  }

  /**
   * Append blocks to a parent block
   */
  async appendBlocks(blockId: string, blocks: BlockObjectRequest[]): Promise<void> {
    try {
      const chunks = this.chunkBlocks(blocks);
      for (const chunk of chunks) {
        await this.rateLimiter.wait();
        await this.client.blocks.children.append({
          block_id: blockId,
          children: chunk,
        });
      }
    } catch (error) {
      if (error instanceof APIResponseError) {
        throw new Error(`Failed to append blocks to ${blockId}: ${error.code}`);
      }
      throw new Error(`Failed to append blocks to ${blockId}: ${error}`);
    }
  }

  /**
   * Update an existing block
   */
  async updateBlock(blockId: string, block: Partial<BlockObjectRequest>): Promise<void> {
    try {
      await this.rateLimiter.wait();
      await this.client.blocks.update({
        block_id: blockId,
        ...block,
      });
    } catch (error) {
      if (error instanceof APIResponseError) {
        throw new Error(`Failed to update block ${blockId}: ${error.code}`);
      }
      throw new Error(`Failed to update block ${blockId}: ${error}`);
    }
  }

  /**
   * Delete a block
   */
  async deleteBlock(blockId: string): Promise<void> {
    try {
      await this.rateLimiter.wait();
      await this.client.blocks.delete({
        block_id: blockId,
      });
    } catch (error) {
      if (error instanceof APIResponseError) {
        throw new Error(`Failed to delete block ${blockId}: ${error.code}`);
      }
      throw new Error(`Failed to delete block ${blockId}: ${error}`);
    }
  }

  /**
   * Create a new page
   */
  async createPage(parentId: string, title: string, content: BlockObjectRequest[]): Promise<string> {
    try {
      await this.rateLimiter.wait();
      const response = await this.client.pages.create({
        parent: { page_id: parentId },
        properties: {
          title: {
            title: [{ text: { content: title } }],
          },
        },
        children: content,
      });
      return response.id;
    } catch (error) {
      if (error instanceof APIResponseError) {
        throw new Error(`Failed to create page under ${parentId}: ${error.code}`);
      }
      throw new Error(`Failed to create page under ${parentId}: ${error}`);
    }
  }

  /**
   * Update a page's title
   */
  async updatePage(destinationId: string, title: string): Promise<void> {
    try {
      await this.rateLimiter.wait();
      await this.client.pages.update({
        page_id: destinationId,
        properties: {
          title: {
            title: [{ text: { content: title } }],
          },
        },
      });
    } catch (error) {
      if (error instanceof APIResponseError) {
        throw new Error(`Failed to update destination ${destinationId}: ${error.code}`);
      }
      throw new Error(`Failed to update destination ${destinationId}: ${error}`);
    }
  }

  /**
   * Get a page by ID
   */
  async getPage(destinationId: string): Promise<GetPageResponse | null> {
    try {
      await this.rateLimiter.wait();
      const page = await this.client.pages.retrieve({ page_id: destinationId });
      return page;
    } catch (error) {
      if (error instanceof APIResponseError && error.code === APIErrorCode.ObjectNotFound) {
        return null;
      }
      throw error;
    }
  }
}
