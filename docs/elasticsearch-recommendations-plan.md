# Feature 8: Product Recommendations with Collaborative Filtering

## Implementation Plan

### Overview
Build a recommendation system that suggests products to users based on:
1. **Collaborative Filtering**: What similar users bought/viewed
2. **Content-Based Filtering**: Similar products based on attributes
3. **Hybrid Approach**: Combine both methods for better results

---

## Architecture Components

### 1. Data Collection Layer
**Purpose**: Track user interactions for recommendation engine

**Implementation**:
- Create interaction tracking models in MongoDB:
  - `ProductView` (userId, productId, timestamp, duration)
  - `ProductPurchase` (userId, productId, timestamp, quantity, price)
  - `ProductRating` (already exists in reviews)
  - `CartAddition` (userId, productId, timestamp)

- Add tracking endpoints:
  - `POST /api/analytics/track-view` - Track product views
  - `POST /api/analytics/track-cart` - Track cart additions
  - Leverage existing purchase/order data

---

### 2. Collaborative Filtering Engine
**Purpose**: Find similar users and recommend based on their behavior

#### Approach A: User-User Collaborative Filtering

**Steps**:
1. **Build user-item interaction matrix**
   - Rows: Users
   - Columns: Products
   - Values: Interaction scores (view=1, cart=2, purchase=5, rating=rating*2)

2. **Calculate user similarity**
   - Use Cosine Similarity or Pearson Correlation
   - Formula: `similarity(userA, userB) = dot(A, B) / (norm(A) * norm(B))`

3. **Find k-nearest neighbors** (similar users)
   - Top 10-20 most similar users

4. **Recommend products**
   - Aggregate products from similar users
   - Weight by user similarity scores
   - Filter out already purchased/viewed products

#### Approach B: Item-Item Collaborative Filtering (Recommended - More Scalable)

**Steps**:
1. **Build item-item similarity matrix**
   - Based on users who interacted with both items
   - Pre-compute similarities (cache in Redis)
   - Formula: `similarity(itemA, itemB) = |users(A) ∩ users(B)| / sqrt(|users(A)| * |users(B)|)`

2. **For recommendations**:
   - Take user's recent interactions
   - Find similar items for each
   - Aggregate and rank by similarity scores

**Why Item-Item is Better**:
- More stable (items change less than user preferences)
- Scales better (fewer items than users typically)
- Can pre-compute and cache
- Better for cold-start users

---

### 3. Content-Based Filtering
**Purpose**: Recommend similar products based on attributes

#### Using Elasticsearch "More Like This" Query

```javascript
// Find products similar to user's purchase history
{
  query: {
    more_like_this: {
      fields: ['name', 'description', 'category', 'tags'],
      like: [
        { _id: 'product1' },
        { _id: 'product2' }
      ],
      min_term_freq: 1,
      max_query_terms: 12,
      min_doc_freq: 2
    }
  }
}
```

**Similarity Factors**:
- Name/description text similarity (TF-IDF)
- Category matching
- Tag overlap
- Seller type

---

### 4. Hybrid Recommendation System
**Combine all approaches for optimal results**

#### Scoring Formula
```
Final Score = (α * collaborative_score) + (β * content_score) + (γ * popularity_score)

Where:
- α = 0.5 (collaborative weight)
- β = 0.3 (content weight)
- γ = 0.2 (popularity weight)
- popularity_score = (purchases + reviews) / max(purchases)
```

#### Personalization Filters
Apply user-specific adjustments:
- Boost preferred categories (from purchase history)
- Filter by price range (user's typical spending)
- Prioritize nearby sellers (geolocation)
- Exclude already purchased items

---

## Implementation Steps

### Phase 1: Data Infrastructure (2-3 hours)
1. Create interaction tracking models:
   - `ProductInteraction.model.ts`
   - Fields: userId, productId, type, score, timestamp
2. Add analytics tracking endpoints
3. Build data aggregation service
4. Set up Redis caching for matrices

### Phase 2: Collaborative Filtering (3-4 hours)
1. Implement user-item matrix builder
   - Aggregate interactions from DB
   - Calculate weighted scores
   - Store in memory/Redis
2. Calculate item-item similarities
   - Cosine similarity algorithm
   - Pre-compute for all products
   - Cache in Redis (update hourly)
3. Create recommendation generator
   - Take user's interaction history
   - Find similar items
   - Rank and filter results

### Phase 3: Content-Based Filtering (1-2 hours)
1. Implement Elasticsearch "More Like This" service
2. Create product similarity endpoint
3. Weight results by relevance score
4. Combine with user preferences

### Phase 4: Hybrid System (2-3 hours)
1. Combine recommendation sources
2. Implement weighted scoring algorithm
3. Add personalization filters:
   - User's preferred categories
   - Price range preferences
   - Location-based availability
   - Exclude purchased items
4. Create recommendation API endpoints

### Phase 5: Optimization (1-2 hours)
1. Add cold-start handling:
   - New users → trending/popular items
   - New products → content-based only
2. Implement fallback mechanisms
3. Add A/B testing capability
4. Performance optimization and caching

---

## API Endpoints

### 1. GET /api/recommendations/for-you
**Personalized recommendations for logged-in user**
- Hybrid: collaborative + content-based + popularity
- Query params: `limit` (default: 20), `category`
- Response:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "product": { /* product details */ },
        "score": 0.85,
        "reasons": ["Similar users bought this", "Matches your preferences"]
      }
    ],
    "total": 20
  }
}
```

### 2. GET /api/recommendations/similar/:productId
**Products similar to given product**
- Content-based using Elasticsearch MLT
- Query params: `limit` (default: 10)
- Response: Similar products with similarity scores

### 3. GET /api/recommendations/trending
**Popular/trending products**
- Based on recent interactions (last 7 days)
- Weighted by purchases, views, ratings
- Query params: `category`, `limit`

### 4. GET /api/recommendations/related-purchases
**"Customers who bought X also bought Y"**
- Item-based collaborative filtering
- Query params: `productId`, `limit`
- Response: Related products with co-purchase frequency

---

## Data Structures

### User-Item Interaction Matrix
**Storage**: Redis (Sparse Matrix)

```typescript
interface UserInteractionMatrix {
  userId: string;
  interactions: {
    [productId: string]: {
      score: number;          // Weighted interaction score
      lastInteraction: Date;
      types: Array<'view' | 'cart' | 'purchase' | 'rating'>;
    }
  };
  lastUpdated: Date;
}
```

**Score Calculation**:
- View: 1 point
- Add to cart: 2 points
- Purchase: 5 points
- Rating: rating_value * 2 points

### Item Similarity Matrix
**Storage**: Redis Cache (Key: `item-sim:{productId}`)

```typescript
interface ItemSimilarity {
  productId: string;
  similarItems: Array<{
    productId: string;
    similarity: number;      // 0-1 score
    commonUsers: number;     // # users who interacted with both
    category: string;
  }>;
  computedAt: Date;
}
```

### Recommendation Cache
**Storage**: Redis (Key: `rec:{userId}`, TTL: 15 minutes)

```typescript
interface CachedRecommendation {
  userId: string;
  recommendations: Array<{
    productId: string;
    score: number;
    sources: {
      collaborative: number;
      contentBased: number;
      popularity: number;
    };
  }>;
  generatedAt: Date;
}
```

---

## Performance Considerations

### 1. Caching Strategy
- **Similarity Matrices**: Redis cache with 1-hour TTL
- **User Recommendations**: Redis cache with 15-minute TTL
- **Trending Products**: Redis cache with 30-minute TTL
- **Invalidation**: Clear user cache on new purchase

### 2. Batch Processing
- **Pre-compute similarities**: Cron job every hour
  - Calculate item-item similarities
  - Update trending products
  - Store in Redis
- **Real-time operations**: Only apply user filters and ranking
- **Incremental updates**: Only recompute changed items

### 3. Scalability
- Use **item-based CF** (scales better than user-based)
- Limit matrix to **recent interactions** (last 90 days)
- **Sample large datasets** for similarity calculations (max 10k users)
- **Sharded Redis** for distributed caching
- **Lazy loading**: Compute recommendations on-demand, cache results

### 4. Cold Start Solutions

#### New Users (No Interaction History)
- Show **trending/popular** items in user's region
- Ask for **category preferences** during onboarding
- Use **demographic-based** recommendations (if available)
- Gradually transition to personalized as they interact

#### New Products (No Purchase History)
- Use **content-based filtering** only
- Recommend to users who bought similar items
- Boost in "New Arrivals" section
- Gradually include in CF as interactions accumulate

---

## Metrics to Track

### 1. Recommendation Quality
- **Click-through rate (CTR)**: % of recommendations clicked
- **Conversion rate**: % of recommendations purchased
- **Average order value**: From recommendations vs. search
- **Revenue impact**: Total revenue from recommendations

### 2. Coverage
- **User coverage**: % of users receiving recommendations
- **Catalog coverage**: % of products being recommended
- **Category distribution**: Ensure diverse recommendations

### 3. Diversity
- **Intra-list diversity**: Variety within recommendation list
- **Category spread**: Avoid showing only one category
- **Novelty**: Balance popular vs. niche items

### 4. System Performance
- **Response time**: API latency (target: <200ms)
- **Cache hit rate**: % of requests served from cache
- **Computation time**: Offline similarity calculations

---

## Libraries & Tools

### Backend
- **Matrix operations**: `mathjs` or `numeric.js`
- **Similarity calculations**: Custom implementation or `ml-distance`
- **Caching**: Redis with `ioredis`
- **Elasticsearch**: Built-in "More Like This" query
- **MongoDB**: Aggregation pipelines for analytics

### Math Formulas

**Cosine Similarity**:
```typescript
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
}
```

**Jaccard Similarity** (for binary interactions):
```typescript
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
```

---

## Implementation Timeline

### Week 1: Foundation (8-10 hours)
- Day 1-2: Data infrastructure and tracking (3 hours)
- Day 3-4: Collaborative filtering engine (4 hours)
- Day 5: Content-based filtering (2 hours)

### Week 2: Integration (8-10 hours)
- Day 1-2: Hybrid system and API (4 hours)
- Day 3: Cold-start solutions (2 hours)
- Day 4-5: Testing and optimization (3 hours)

### Total Estimated Time
- **Implementation**: 10-15 hours
- **Testing**: 3-5 hours
- **Optimization**: 2-3 hours
- **Documentation**: 1-2 hours
- **Total**: ~20 hours for production-ready system

---

## Testing Strategy

### Unit Tests
- Similarity calculation functions
- Score weighting algorithms
- Cache invalidation logic

### Integration Tests
- End-to-end recommendation flow
- API endpoint responses
- Database interaction tracking

### A/B Testing
- Control group: No recommendations
- Test group A: Collaborative filtering only
- Test group B: Hybrid approach
- Measure: CTR, conversion rate, revenue

---

## Future Enhancements

### Phase 2 Features
1. **Deep Learning**: Neural collaborative filtering (NCF)
2. **Contextual recommendations**: Time-of-day, weather, seasonality
3. **Social features**: Friend recommendations, social proof
4. **Real-time updates**: Stream processing with Kafka
5. **Multi-armed bandit**: Dynamic A/B testing
6. **Explanation generation**: "Why this product?" reasoning

### Advanced Techniques
- **Matrix Factorization**: SVD, ALS for better CF
- **Graph Neural Networks**: For complex relationships
- **Reinforcement Learning**: Optimize long-term engagement
- **Ensemble methods**: Combine multiple models

---

## References

- [Collaborative Filtering - Wikipedia](https://en.wikipedia.org/wiki/Collaborative_filtering)
- [Elasticsearch More Like This](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-mlt-query.html)
- [Recommender Systems Handbook](https://www.springer.com/gp/book/9780387858203)
- [Netflix Prize - Collaborative Filtering](https://www.netflixprize.com/)

---

## Conclusion

This recommendation system provides a solid foundation for personalized product suggestions in the LiveMart marketplace. By combining collaborative filtering, content-based filtering, and popularity signals, it delivers relevant recommendations while handling cold-start problems and scaling efficiently.

The phased implementation approach allows for iterative development and testing, with clear metrics to measure success and guide future improvements.
