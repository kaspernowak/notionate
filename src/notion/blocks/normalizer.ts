import { BlockObjectResponse, BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';

/**
 * Normalizes Notion API blocks to match Martian's block format by removing
 * metadata fields and keeping only content-related properties
 */
export class BlockNormalizer {
  private metadataProps = [
    'id',
    'created_time',
    'created_by',
    'last_edited_time',
    'last_edited_by',
    'parent',
    'archived',
    'object'
  ];

  /**
   * Normalize a Notion block to match Martian block structure by removing
   * metadata properties and keeping only content-related properties
   */
  normalize(block: BlockObjectResponse | BlockObjectRequest): BlockObjectRequest {
    // Create a deep copy of the block
    const copy = JSON.parse(JSON.stringify(block));
    
    // Remove all metadata properties from the root
    this.metadataProps.forEach(prop => {
      delete copy[prop];
    });

    // Remove metadata from the block content
    if (copy.type && copy[copy.type] && typeof copy[copy.type] === 'object') {
      const content = copy[copy.type];
      
      this.metadataProps.forEach(prop => {
        delete content[prop];
      });

      // Recursively normalize children if they exist
      if (content.children && Array.isArray(content.children)) {
        content.children = content.children.map((child: BlockObjectResponse | BlockObjectRequest) => this.normalize(child));
      }
    }

    return copy as BlockObjectRequest;
  }
}
