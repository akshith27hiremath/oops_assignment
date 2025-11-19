import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger';

/**
 * Elasticsearch Service
 * Handles all Elasticsearch operations for product search
 */

class ElasticsearchService {
  private client: Client;
  private isConnected: boolean = false;
  private readonly INDEX_NAME = 'products';

  constructor() {
    const elasticsearchUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';

    this.client = new Client({
      node: elasticsearchUrl,
    });

    this.initializeConnection();
  }

  /**
   * Initialize connection and create index if needed
   */
  private async initializeConnection() {
    try {
      // Test connection
      const health = await this.client.cluster.health();
      this.isConnected = true;
      logger.info(`✅ Elasticsearch connected - Cluster: ${health.cluster_name}, Status: ${health.status}`);

      // Check if index exists, create if not
      await this.ensureIndexExists();
    } catch (error: any) {
      logger.error('❌ Failed to connect to Elasticsearch:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Ensure the products index exists with proper mapping
   */
  private async ensureIndexExists() {
    try {
      const indexExists = await this.client.indices.exists({ index: this.INDEX_NAME });

      if (!indexExists) {
        await this.createProductsIndex();
        logger.info(`✅ Created Elasticsearch index: ${this.INDEX_NAME}`);
      } else {
        logger.info(`✅ Elasticsearch index already exists: ${this.INDEX_NAME}`);
      }
    } catch (error: any) {
      logger.error('❌ Error checking/creating index:', error.message);
    }
  }

  /**
   * Create products index with mapping
   */
  private async createProductsIndex() {
    await this.client.indices.create({
      index: this.INDEX_NAME,
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              autocomplete_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'autocomplete_filter']
              },
              autocomplete_search_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase']
              }
            },
            filter: {
              autocomplete_filter: {
                type: 'edge_ngram',
                min_gram: 2,
                max_gram: 20
              }
            }
          }
        },
        mappings: {
          properties: {
            productId: { type: 'keyword' },
            name: {
              type: 'text',
              analyzer: 'autocomplete_analyzer',
              search_analyzer: 'autocomplete_search_analyzer',
              fields: {
                keyword: { type: 'keyword' },
                suggest: { type: 'completion' }
              }
            },
            description: {
              type: 'text',
              analyzer: 'standard'
            },
            category: {
              type: 'keyword',
              fields: {
                text: { type: 'text' }
              }
            },
            subcategory: { type: 'keyword' },
            tags: { type: 'keyword' },
            basePrice: { type: 'float' },
            unit: { type: 'keyword' },
            sellerId: { type: 'keyword' },
            sellerName: { type: 'text' },
            sellerType: { type: 'keyword' },
            location: { type: 'geo_point' },
            averageRating: { type: 'float' },
            reviewCount: { type: 'integer' },
            images: { type: 'keyword' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        }
      }
    });
  }

  /**
   * Check if Elasticsearch is connected
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Index a product (add or update)
   */
  async indexProduct(product: any): Promise<void> {
    if (!this.isConnected) {
      logger.warn('⚠️  Elasticsearch not connected, skipping indexing');
      return;
    }

    try {
      await this.client.index({
        index: this.INDEX_NAME,
        id: product._id.toString(),
        document: {
          productId: product._id.toString(),
          name: product.name,
          description: product.description || '',
          category: product.category?.name || '',
          subcategory: product.category?.subcategory || '',
          tags: product.tags || [],
          basePrice: product.basePrice,
          unit: product.unit,
          sellerId: product.createdBy?._id?.toString() || product.createdBy?.toString(),
          sellerName: product.createdBy?.profile?.name || product.createdBy?.businessName || '',
          sellerType: product.createdBy?.userType || '',
          location: product.createdBy?.profile?.location ? {
            lat: product.createdBy.profile.location.coordinates[1],
            lon: product.createdBy.profile.location.coordinates[0]
          } : null,
          averageRating: product.averageRating || 0,
          reviewCount: product.reviewCount || 0,
          images: product.images || [],
          isActive: product.isActive !== false,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        },
        refresh: true
      });

      logger.info(`✅ Indexed product: ${product.name}`);
    } catch (error: any) {
      logger.error(`❌ Failed to index product ${product._id}:`, error.message);
    }
  }

  /**
   * Bulk index multiple products
   */
  async bulkIndexProducts(products: any[]): Promise<void> {
    if (!this.isConnected) {
      logger.warn('⚠️  Elasticsearch not connected, skipping bulk indexing');
      return;
    }

    if (products.length === 0) return;

    try {
      const operations = products.flatMap(product => [
        { index: { _index: this.INDEX_NAME, _id: product._id.toString() } },
        {
          productId: product._id.toString(),
          name: product.name,
          description: product.description || '',
          category: product.category?.name || '',
          subcategory: product.category?.subcategory || '',
          tags: product.tags || [],
          basePrice: product.basePrice,
          unit: product.unit,
          sellerId: product.createdBy?._id?.toString() || product.createdBy?.toString(),
          sellerName: product.createdBy?.profile?.name || product.createdBy?.businessName || '',
          sellerType: product.createdBy?.userType || '',
          location: product.createdBy?.profile?.location ? {
            lat: product.createdBy.profile.location.coordinates[1],
            lon: product.createdBy.profile.location.coordinates[0]
          } : null,
          averageRating: product.averageRating || 0,
          reviewCount: product.reviewCount || 0,
          images: product.images || [],
          isActive: product.isActive !== false,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        }
      ]);

      const result = await this.client.bulk({ operations, refresh: true });

      if (result.errors) {
        logger.error('❌ Bulk indexing had errors');
      } else {
        logger.info(`✅ Bulk indexed ${products.length} products`);
      }
    } catch (error: any) {
      logger.error('❌ Failed to bulk index products:', error.message);
    }
  }

  /**
   * Delete a product from index
   */
  async deleteProduct(productId: string): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.client.delete({
        index: this.INDEX_NAME,
        id: productId,
        refresh: true
      });
      logger.info(`✅ Deleted product from index: ${productId}`);
    } catch (error: any) {
      if (error.meta?.statusCode !== 404) {
        logger.error(`❌ Failed to delete product ${productId}:`, error.message);
      }
    }
  }

  /**
   * Get Elasticsearch client
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Get index name
   */
  getIndexName(): string {
    return this.INDEX_NAME;
  }

  /**
   * Smart Product Search with fuzzy matching and multi-field search
   * Searches across name, description, category, tags with typo tolerance
   */
  async searchProducts(params: {
    query: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sellerType?: 'RETAILER' | 'WHOLESALER';
    minRating?: number;
    page?: number;
    limit?: number;
    sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'newest';
  }): Promise<{
    products: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!this.isConnected) {
      return { products: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }

    const {
      query,
      category,
      minPrice,
      maxPrice,
      sellerType,
      minRating,
      page = 1,
      limit = 20,
      sortBy = 'relevance',
    } = params;

    try {
      // Build search query
      const must: any[] = [
        { term: { isActive: true } }, // Only active products
      ];

      // Multi-field search with fuzzy matching
      if (query && query.trim()) {
        must.push({
          multi_match: {
            query: query.trim(),
            fields: [
              'name^3',           // Boost name matches
              'description^1',
              'category.text^2',
              'tags^2',
              'sellerName^1',
            ],
            type: 'best_fields',
            fuzziness: 'AUTO',     // Automatic fuzzy matching (typo tolerance)
            prefix_length: 2,      // Require first 2 chars to match
            operator: 'or',
          },
        });
      }

      // Filters
      const filter: any[] = [];

      if (category) {
        filter.push({ term: { category } });
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        const range: any = {};
        if (minPrice !== undefined) range.gte = minPrice;
        if (maxPrice !== undefined) range.lte = maxPrice;
        filter.push({ range: { basePrice: range } });
      }

      if (sellerType) {
        filter.push({ term: { sellerType } });
      }

      if (minRating !== undefined) {
        filter.push({ range: { averageRating: { gte: minRating } } });
      }

      // Build sort
      let sort: any[] = [];
      switch (sortBy) {
        case 'price_asc':
          sort = [{ basePrice: 'asc' }];
          break;
        case 'price_desc':
          sort = [{ basePrice: 'desc' }];
          break;
        case 'rating':
          sort = [{ averageRating: 'desc' }, { reviewCount: 'desc' }];
          break;
        case 'newest':
          sort = [{ createdAt: 'desc' }];
          break;
        case 'relevance':
        default:
          sort = [{ _score: 'desc' }, { averageRating: 'desc' }];
          break;
      }

      // Calculate pagination
      const from = (page - 1) * limit;

      // Execute search
      const result = await this.client.search({
        index: this.INDEX_NAME,
        body: {
          query: {
            bool: {
              must,
              filter: filter.length > 0 ? filter : undefined,
            },
          },
          sort,
          from,
          size: limit,
          track_total_hits: true,
        },
      });

      // Extract results
      const hits = result.hits.hits;
      const total = typeof result.hits.total === 'number'
        ? result.hits.total
        : result.hits.total?.value || 0;

      const products = hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score,
      }));

      return {
        products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error('❌ Search error:', error.message);
      return { products: [], total: 0, page: 1, limit, totalPages: 0 };
    }
  }

  /**
   * Get autocomplete suggestions for product search
   * Uses completion suggester for fast prefix matching
   */
  async getSuggestions(prefix: string, limit: number = 10): Promise<Array<{ _id: string; name: string; basePrice: number; unit: string }>> {
    if (!this.isConnected || !prefix || prefix.length < 2) {
      return [];
    }

    try {
      // Use regular search with fuzzy matching to get full product details
      const result = await this.client.search({
        index: this.INDEX_NAME,
        body: {
          size: limit,
          query: {
            bool: {
              should: [
                {
                  match: {
                    name: {
                      query: prefix.trim(),
                      fuzziness: 'AUTO',
                      prefix_length: 1,
                    },
                  },
                },
                {
                  match_phrase_prefix: {
                    name: {
                      query: prefix.trim(),
                    },
                  },
                },
              ],
            },
          },
          _source: ['productId', 'name', 'basePrice', 'unit'],
        },
      });

      // Extract product details from hits
      const hits = result.hits.hits || [];
      return hits.map((hit: any) => ({
        _id: hit._source.productId,
        name: hit._source.name,
        basePrice: hit._source.basePrice,
        unit: hit._source.unit || 'unit',
      }));
    } catch (error: any) {
      logger.error('❌ Autocomplete error:', error.message);
      return [];
    }
  }

  /**
   * Search products near a location (geospatial search)
   * Finds products within specified radius from coordinates
   */
  async searchNearby(params: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    page?: number;
    limit?: number;
    sortBy?: 'distance' | 'price_asc' | 'price_desc' | 'rating';
  }): Promise<{
    products: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!this.isConnected) {
      return { products: [], total: 0, page: 1, limit: 10, totalPages: 0 };
    }

    const {
      latitude,
      longitude,
      radius,
      query,
      category,
      minPrice,
      maxPrice,
      minRating,
      page = 1,
      limit = 20,
      sortBy = 'distance',
    } = params;

    try {
      // Build query
      const must: any[] = [
        { term: { isActive: true } },
      ];

      // Text search if query provided
      if (query && query.trim()) {
        must.push({
          multi_match: {
            query: query.trim(),
            fields: ['name^3', 'description^1', 'category.text^2', 'tags^2'],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      }

      // Build filters
      const filter: any[] = [
        // Geo-distance filter
        {
          geo_distance: {
            distance: `${radius}km`,
            location: {
              lat: latitude,
              lon: longitude,
            },
          },
        },
      ];

      if (category) {
        filter.push({ term: { category } });
      }

      if (minPrice !== undefined || maxPrice !== undefined) {
        const range: any = {};
        if (minPrice !== undefined) range.gte = minPrice;
        if (maxPrice !== undefined) range.lte = maxPrice;
        filter.push({ range: { basePrice: range } });
      }

      if (minRating !== undefined) {
        filter.push({ range: { averageRating: { gte: minRating } } });
      }

      // Build sort
      let sort: any[] = [];
      switch (sortBy) {
        case 'distance':
          sort = [
            {
              _geo_distance: {
                location: {
                  lat: latitude,
                  lon: longitude,
                },
                order: 'asc',
                unit: 'km',
              },
            },
          ];
          break;
        case 'price_asc':
          sort = [{ basePrice: 'asc' }];
          break;
        case 'price_desc':
          sort = [{ basePrice: 'desc' }];
          break;
        case 'rating':
          sort = [{ averageRating: 'desc' }, { reviewCount: 'desc' }];
          break;
      }

      // Calculate pagination
      const from = (page - 1) * limit;

      // Execute search
      const result = await this.client.search({
        index: this.INDEX_NAME,
        body: {
          query: {
            bool: {
              must,
              filter,
            },
          },
          sort,
          from,
          size: limit,
          track_total_hits: true,
        },
      });

      // Extract results with distance
      const hits = result.hits.hits;
      const total = typeof result.hits.total === 'number'
        ? result.hits.total
        : result.hits.total?.value || 0;

      const products = hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score,
        distance: hit.sort?.[0], // Distance in km if sorted by distance
      }));

      return {
        products,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error('❌ Nearby search error:', error.message);
      return { products: [], total: 0, page: 1, limit, totalPages: 0 };
    }
  }

  /**
   * Price comparison across sellers for similar products
   * Groups products by name similarity and compares prices
   */
  async comparePrices(productName: string, limit: number = 10): Promise<{
    productName: string;
    totalSellers: number;
    lowestPrice: number;
    highestPrice: number;
    averagePrice: number;
    sellers: Array<{
      sellerId: string;
      sellerName: string;
      sellerType: string;
      price: number;
      unit: string;
      rating: number;
      location: { lat: number; lon: number } | null;
      productId: string;
    }>;
  }> {
    if (!this.isConnected || !productName || productName.trim().length < 2) {
      return {
        productName: '',
        totalSellers: 0,
        lowestPrice: 0,
        highestPrice: 0,
        averagePrice: 0,
        sellers: [],
      };
    }

    try {
      // Search for similar products
      const result = await this.client.search({
        index: this.INDEX_NAME,
        body: {
          query: {
            bool: {
              must: [
                { term: { isActive: true } },
                {
                  multi_match: {
                    query: productName.trim(),
                    fields: ['name^3', 'description'],
                    type: 'best_fields',
                    fuzziness: 'AUTO',
                  },
                },
              ],
            },
          },
          sort: [{ basePrice: 'asc' }],
          size: limit,
        },
      });

      const hits = result.hits.hits;

      if (hits.length === 0) {
        return {
          productName,
          totalSellers: 0,
          lowestPrice: 0,
          highestPrice: 0,
          averagePrice: 0,
          sellers: [],
        };
      }

      // Extract seller price information
      const sellers = hits.map((hit: any) => {
        const product = hit._source;
        return {
          sellerId: product.sellerId,
          sellerName: product.sellerName || 'Unknown',
          sellerType: product.sellerType || 'RETAILER',
          price: product.basePrice,
          unit: product.unit,
          rating: product.averageRating || 0,
          location: product.location,
          productId: product.productId,
        };
      });

      // Calculate price statistics
      const prices = sellers.map((s: any) => s.price);
      const lowestPrice = Math.min(...prices);
      const highestPrice = Math.max(...prices);
      const averagePrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

      return {
        productName,
        totalSellers: sellers.length,
        lowestPrice,
        highestPrice,
        averagePrice: Math.round(averagePrice * 100) / 100,
        sellers,
      };
    } catch (error: any) {
      logger.error('❌ Price comparison error:', error.message);
      return {
        productName,
        totalSellers: 0,
        lowestPrice: 0,
        highestPrice: 0,
        averagePrice: 0,
        sellers: [],
      };
    }
  }
}

export const elasticsearchService = new ElasticsearchService();
export default elasticsearchService;
