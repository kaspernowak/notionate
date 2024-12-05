import { BlockComparator } from './blocks/comparator';
import { BlockNormalizer } from './blocks/normalizer';
import { NotionClient } from './api/client';
import { SyncService } from './sync';

/**
 * Creates a new instance of SyncService with all required dependencies
 */
export function createNotionService(notionToken: string): SyncService {
  // Create dependencies in the correct order
  const normalizer = new BlockNormalizer();
  const comparator = new BlockComparator(normalizer);
  const client = new NotionClient(notionToken);
  
  // Create service with client and comparator
  return new SyncService(client, comparator);
}

export { SyncService } from './sync';
