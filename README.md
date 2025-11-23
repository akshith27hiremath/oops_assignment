# Live MART - E-Commerce Marketplace Platform

> A comprehensive multi-stakeholder e-commerce platform connecting Customers, Retailers, and Wholesalers with real-time features, intelligent search, and seamless UPI payment integration.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Docker Setup (Recommended)](#docker-setup-recommended)
  - [Manual Setup](#manual-setup)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Live MART** is a modern, full-stack e-commerce marketplace built with cutting-edge technologies and Object-Oriented Programming principles. The platform facilitates a complete supply chain ecosystem:

- **Customers**: Browse products, search with advanced filters, manage wishlists, place orders, and track deliveries in real-time
- **Retailers**: Manage inventory, process customer orders, order from wholesalers, view analytics, and optimize pricing
- **Wholesalers**: Supply products to retailers, manage bulk orders, monitor retailer networks, and analyze distribution metrics

### Key Highlights

- Real-time order updates via WebSocket (Socket.IO)
- Elasticsearch-powered smart search with auto-complete
- UPI payment integration (PhonePe, Google Pay, Paytm, Razorpay)
- Role-based access control (RBAC)
- Google Maps integration for location-based services
- AI-powered recommendations and price monitoring
- Comprehensive analytics dashboards
- Mobile-responsive design with React and Tailwind CSS

---

## Features

### Module 1: Registration & Authentication

- Multi-role user registration (Customer/Retailer/Wholesaler)
- OTP verification via SMS (Twilio) and Email (SendGrid)
- Social login with OAuth 2.0 (Google and Facebook)
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Secure password hashing with bcrypt

### Module 2: User Dashboards

#### Customer Dashboard
- Personalized product recommendations
- Category and subcategory browsing
- Wishlist management
- Order history with status tracking
- Nearby stores with Google Maps integration
- Real-time order notifications

#### Retailer Dashboard
- Inventory management with low-stock alerts
- Sales analytics and revenue insights
- Customer purchase history
- Wholesaler order management
- Real-time price monitoring
- Product performance metrics

#### Wholesaler Dashboard
- Retailer network management
- Bulk order processing and fulfillment
- Pricing strategy tools
- Distribution analytics
- Inventory oversight
- Performance dashboards

### Module 3: Search & Navigation

- Elasticsearch-powered search with fuzzy matching
- Advanced filters (price range, category, location, stock status)
- Location-based store suggestions
- Auto-complete with typo tolerance
- Category and tag-based navigation
- Recently viewed products

### Module 4: Order & Payment Management

- Shopping cart with session persistence
- Multi-gateway UPI payment support:
  - PhonePe Payment Gateway
  - Google Pay
  - Paytm
  - Razorpay
- Order tracking with real-time status updates
- Delivery scheduling with Google Calendar integration
- Email and SMS notifications at each order stage
- Automatic inventory deduction
- Invoice generation (PDF)

### Module 5: Feedback & Real-Time Communication

- Product ratings and reviews
- Real-time order updates via Socket.IO
- Email notifications (SendGrid)
- SMS notifications (Twilio)
- In-app notification center
- WebSocket-based live updates

### Additional Features

- Recipe recommendations based on products
- Discount codes and promotional offers
- Price monitoring with automated alerts
- Business intelligence and analytics
- Wishlist sharing
- Multi-currency support (future)
- Progressive Web App (PWA) capabilities

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with TypeScript |
| **Zustand** | State management |
| **TanStack Query** | Data fetching and caching |
| **React Router v6** | Client-side routing |
| **React Hook Form** | Form management |
| **Zod** | Schema validation |
| **Tailwind CSS** | Utility-first CSS framework |
| **Headless UI** | Accessible UI components |
| **Chart.js** | Data visualization |
| **Google Maps API** | Maps and location services |
| **Socket.IO Client** | Real-time communication |
| **Axios** | HTTP client |

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js 18+** | JavaScript runtime |
| **Express.js** | Web framework |
| **TypeScript** | Type-safe JavaScript |
| **MongoDB** | NoSQL database |
| **Mongoose** | MongoDB ODM |
| **Redis** | Caching and session storage |
| **Elasticsearch** | Search engine |
| **JWT** | Authentication tokens |
| **Passport.js** | OAuth strategies |
| **Socket.IO** | WebSocket server |
| **Bull** | Job queue for background tasks |
| **Winston** | Logging |

### Infrastructure & DevOps

- **Docker & Docker Compose** - Containerization
- **MongoDB 7** - Document database
- **Redis 7** - In-memory cache
- **Elasticsearch 8.11** - Search and analytics
- **Nginx** - Reverse proxy and load balancing
- **AWS S3 / Cloudinary** - File storage

### Third-Party Services

- **SendGrid** - Transactional emails
- **Twilio** - SMS notifications
- **Google Maps API** - Location services
- **Google OAuth 2.0** - Social authentication
- **Facebook OAuth** - Social authentication
- **PhonePe / Paytm / Razorpay** - Payment gateways

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │  Customer  │  │  Retailer  │  │ Wholesaler │                │
│  │    App     │  │    App     │  │    App     │                │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘                │
│        │                │                │                        │
│        └────────────────┼────────────────┘                       │
│                         │                                         │
└─────────────────────────┼─────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼────────┐ ┌─────▼──────┐ ┌────────▼────────┐
│   Express.js   │ │  Socket.IO │ │   Static Files  │
│   REST API     │ │  WebSocket │ │                 │
│   Port 5000    │ │            │ │                 │
└───────┬────────┘ └─────┬──────┘ └─────────────────┘
        │                │
        └────────┬───────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼────┐  ┌───▼─────┐  ┌──▼──────────┐
│MongoDB │  │  Redis  │  │Elasticsearch│
│ :27017 │  │  :6379  │  │    :9200    │
└────────┘  └─────────┘  └─────────────┘
```

### Design Patterns

- **MVC (Model-View-Controller)** - Separation of concerns
- **Repository Pattern** - Data access abstraction
- **Factory Pattern** - Dynamic object creation
- **Strategy Pattern** - Payment gateway selection
- **Observer Pattern** - Real-time event notifications
- **Singleton Pattern** - Database connection pooling
- **Middleware Pattern** - Request/response processing

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** >= 9.0.0 (comes with Node.js)
- **Docker** >= 20.10 ([Download](https://www.docker.com/get-started))
- **Docker Compose** >= 2.0
- **Git** ([Download](https://git-scm.com/))

### Environment Configuration

The application requires various environment variables for full functionality. Follow these steps:

#### 1. Copy the Environment Template

```bash
cp .env.example .env.development
```

#### 2. Essential Environment Variables

Edit `.env.development` with the following **required** values:

```bash
# Application
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
API_BASE_URL=http://localhost:5000

# Database - MongoDB (Auto-configured in Docker)
MONGODB_URI=mongodb://admin:password123@localhost:27017/livemart_dev?authSource=admin

# Redis (Auto-configured in Docker)
REDIS_URL=redis://localhost:6379

# Elasticsearch (Auto-configured in Docker)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=livemart_products

# Authentication Secrets (CHANGE IN PRODUCTION!)
JWT_SECRET=dev-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Session
SESSION_SECRET=your-session-secret-key

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:80
```

#### 3. Optional Third-Party Services

To enable full features, configure these optional services:

##### Google OAuth (Social Login)
```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```
Get credentials: [Google Cloud Console](https://console.cloud.google.com/)

##### Facebook OAuth (Social Login)
```bash
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/auth/facebook/callback
```
Get credentials: [Facebook Developers](https://developers.facebook.com/)

##### PhonePe Payment Gateway
```bash
PHONEPE_MERCHANT_ID=your-merchant-id
PHONEPE_SALT_KEY=your-salt-key
PHONEPE_SALT_INDEX=1
PHONEPE_HOST_URL=https://api-preprod.phonepe.com/apis/pg-sandbox
```
Get credentials: [PhonePe Merchant Dashboard](https://www.phonepe.com/business/)

##### Google Maps API (Location Services)
```bash
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_PLACES_API_KEY=your-google-places-api-key
```
Get API key: [Google Maps Platform](https://developers.google.com/maps)

##### SendGrid (Email Notifications)
```bash
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@livemart.com
SENDGRID_FROM_NAME=Live MART
```
Get API key: [SendGrid](https://sendgrid.com/)

##### Twilio (SMS Notifications)
```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_VERIFY_SERVICE_SID=your-verify-service-sid
```
Get credentials: [Twilio Console](https://www.twilio.com/console)

##### AWS S3 (File Storage)
```bash
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=livemart-files
AWS_REGION=us-east-1
```
Get credentials: [AWS IAM](https://console.aws.amazon.com/iam/)

#### 4. Client Environment Variables

Create `client/.env`:

```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
REACT_APP_RAZORPAY_KEY_ID=your-razorpay-key-id
```

---

### Docker Setup (Recommended)

Docker provides the easiest way to run the entire stack with all dependencies.

#### Step 1: Start All Services

```bash
# Navigate to project root
cd assignmentoops2

# Start all services in development mode with hot-reload
docker-compose -f docker/docker-compose.dev.yml up -d

# View logs (optional)
docker-compose -f docker/docker-compose.dev.yml logs -f

# View logs for specific service
docker-compose -f docker/docker-compose.dev.yml logs -f api
docker-compose -f docker/docker-compose.dev.yml logs -f client
```

This command starts:
- **MongoDB** (Port 27017) - Database
- **Redis** (Port 6379) - Cache
- **Elasticsearch** (Port 9200) - Search engine
- **Backend API** (Port 5000) - Node.js server with hot-reload
- **Frontend Client** (Port 3000) - React app with hot-reload

#### Step 2: Verify Services

```bash
# Check running containers
docker ps

# Expected output:
# livemart-mongodb-dev
# livemart-redis-dev
# livemart-elasticsearch-dev
# livemart-api-dev
# livemart-client-dev
```

#### Step 3: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health
- **MongoDB**: mongodb://admin:password123@localhost:27017
- **Redis**: redis://localhost:6379
- **Elasticsearch**: http://localhost:9200

#### Step 4: Stop Services

```bash
# Stop all containers
docker-compose -f docker/docker-compose.dev.yml down

# Stop and remove volumes (deletes all data)
docker-compose -f docker/docker-compose.dev.yml down -v
```

#### Docker Compose Configuration Details

The `docker-compose.dev.yml` file configures:

##### MongoDB Container
```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: password123
  MONGO_INITDB_DATABASE: livemart_dev
```

##### Backend API Container
```yaml
environment:
  NODE_ENV: development
  PORT: 5000
  MONGODB_URI: mongodb://admin:password123@mongodb:27017/livemart_dev?authSource=admin
  REDIS_URL: redis://redis:6379
  ELASTICSEARCH_URL: http://elasticsearch:9200
  JWT_SECRET: dev-jwt-secret-key
  JWT_REFRESH_SECRET: dev-refresh-secret-key
```

##### Frontend Client Container
```yaml
environment:
  REACT_APP_API_URL: http://localhost:5000/api
  REACT_APP_SOCKET_URL: http://localhost:5000
  CHOKIDAR_USEPOLLING: true  # Enables hot-reload in Docker
```

---

### Manual Setup

If you prefer not to use Docker, you can run services manually.

#### Step 1: Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

#### Step 2: Start External Services

You need to have MongoDB, Redis, and Elasticsearch running locally:

##### MongoDB
```bash
# Using Homebrew (macOS)
brew install mongodb-community@7
brew services start mongodb-community

# Using apt (Ubuntu/Debian)
sudo apt-get install mongodb-org
sudo systemctl start mongod

# Docker (alternative)
docker run -d -p 27017:27017 --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  mongo:7
```

##### Redis
```bash
# Using Homebrew (macOS)
brew install redis
brew services start redis

# Using apt (Ubuntu/Debian)
sudo apt-get install redis-server
sudo systemctl start redis

# Docker (alternative)
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

##### Elasticsearch
```bash
# Docker (recommended)
docker run -d -p 9200:9200 -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  --name elasticsearch \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

#### Step 3: Update Environment Variables

Ensure your `.env` file has local connection strings:

```bash
MONGODB_URI=mongodb://localhost:27017/livemart_dev
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200
```

#### Step 4: Start Backend Server

```bash
cd server
npm run dev

# Server will start at http://localhost:5000
```

#### Step 5: Start Frontend Client

```bash
# In a new terminal
cd client
npm start

# Client will start at http://localhost:3000
```

#### Step 6: Seed Database (Optional)

```bash
cd server
npm run db:seed
```

---

## Project Structure

```
assignmentoops2/
│
├── client/                          # Frontend React Application
│   ├── public/                      # Static assets
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   ├── src/
│   │   ├── assets/                  # Images, icons, fonts
│   │   ├── components/              # Reusable UI components
│   │   │   ├── common/              # Shared components
│   │   │   ├── customer/            # Customer-specific components
│   │   │   ├── retailer/            # Retailer-specific components
│   │   │   └── wholesaler/          # Wholesaler-specific components
│   │   ├── contexts/                # React Context providers
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── pages/                   # Page components
│   │   │   ├── auth/                # Authentication pages
│   │   │   ├── customer/            # Customer dashboard
│   │   │   ├── retailer/            # Retailer dashboard
│   │   │   └── wholesaler/          # Wholesaler dashboard
│   │   ├── services/                # API service layer
│   │   │   ├── api.ts               # Axios instance
│   │   │   ├── auth.service.ts
│   │   │   ├── product.service.ts
│   │   │   └── order.service.ts
│   │   ├── stores/                  # Zustand state stores
│   │   ├── types/                   # TypeScript type definitions
│   │   ├── utils/                   # Utility functions
│   │   ├── App.tsx                  # Root component
│   │   └── index.tsx                # Entry point
│   ├── package.json
│   └── tailwind.config.js
│
├── server/                          # Backend Node.js Application
│   ├── src/
│   │   ├── config/                  # Configuration files
│   │   │   ├── database.ts          # MongoDB connection
│   │   │   ├── redis.ts             # Redis client
│   │   │   └── passport.ts          # Passport strategies
│   │   ├── controllers/             # Route controllers
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── product.controller.ts
│   │   │   ├── order.controller.ts
│   │   │   └── payment.controller.ts
│   │   ├── middleware/              # Express middleware
│   │   │   ├── auth.middleware.ts   # JWT verification
│   │   │   ├── rbac.middleware.ts   # Role-based access
│   │   │   └── validator.middleware.ts
│   │   ├── models/                  # Mongoose models
│   │   │   ├── User.model.ts
│   │   │   ├── Customer.model.ts
│   │   │   ├── Retailer.model.ts
│   │   │   ├── Wholesaler.model.ts
│   │   │   ├── Product.model.ts
│   │   │   ├── Order.model.ts
│   │   │   └── Transaction.model.ts
│   │   ├── routes/                  # Express routes
│   │   │   ├── index.ts             # Route aggregator
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── product.routes.ts
│   │   │   ├── order.routes.ts
│   │   │   ├── payment.routes.ts
│   │   │   ├── inventory.routes.ts
│   │   │   ├── wholesale.routes.ts
│   │   │   ├── analytics.routes.ts
│   │   │   └── search.routes.ts
│   │   ├── services/                # Business logic layer
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── product.service.ts
│   │   │   ├── order.service.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── elasticsearch.service.ts
│   │   │   ├── socket.service.ts
│   │   │   └── notification.service.ts
│   │   ├── jobs/                    # Background jobs
│   │   │   └── priceMonitoring.job.ts
│   │   ├── utils/                   # Utility functions
│   │   │   ├── logger.ts            # Winston logger
│   │   │   ├── validator.ts
│   │   │   └── helpers.ts
│   │   ├── types/                   # TypeScript types
│   │   └── app.ts                   # Express app entry
│   ├── package.json
│   └── tsconfig.json
│
├── docker/                          # Docker configuration
│   ├── Dockerfile.client            # Client container
│   ├── Dockerfile.server            # Server container
│   ├── docker-compose.yml           # Production compose
│   └── docker-compose.dev.yml       # Development compose
│
├── nginx/                           # Nginx configuration
│   └── nginx.conf
│
├── docs/                            # Documentation
│   ├── README.md
│   ├── SETUP_GUIDE.md
│   └── IMPLEMENTATION_ROADMAP.md
│
├── scripts/                         # Utility scripts
│
├── shared/                          # Shared TypeScript types
│
├── .env.example                     # Environment template
├── .gitignore
├── README.md                        # This file
└── package.json
```

---

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/refresh` | Refresh access token | Yes |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/auth/google` | Google OAuth login | No |
| GET | `/api/auth/facebook` | Facebook OAuth login | No |

### Product Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/products` | List all products | No |
| GET | `/api/products/:id` | Get product details | No |
| POST | `/api/products` | Create product | Yes (Retailer) |
| PUT | `/api/products/:id` | Update product | Yes (Retailer) |
| DELETE | `/api/products/:id` | Delete product | Yes (Retailer) |

### Order Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/orders` | List user orders | Yes |
| POST | `/api/orders` | Create new order | Yes (Customer) |
| GET | `/api/orders/:id` | Get order details | Yes |
| PATCH | `/api/orders/:id/status` | Update order status | Yes (Retailer) |

### Payment Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/payments/upi/initiate` | Initiate UPI payment | Yes |
| POST | `/api/payments/verify` | Verify payment status | Yes |
| GET | `/api/payments/history` | Payment history | Yes |

### Search Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/search` | Search products | No |
| GET | `/api/search/suggestions` | Auto-complete | No |

### Analytics Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/analytics/sales` | Sales analytics | Yes (Retailer/Wholesaler) |
| GET | `/api/analytics/customers` | Customer insights | Yes (Retailer) |

For full API documentation, run the server with `SWAGGER_ENABLED=true` and visit:
```
http://localhost:5000/api-docs
```

---

## Development

### Available Scripts

#### Server Scripts

```bash
cd server

# Development
npm run dev              # Start dev server with hot-reload (nodemon + ts-node)
npm run build            # Compile TypeScript to JavaScript
npm start                # Start production server
npm run start:prod       # Start with NODE_ENV=production

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format code with Prettier
npm run typecheck        # Run TypeScript type checking

# Testing
npm test                 # Run tests with Jest
npm run test:watch       # Run tests in watch mode
npm run test:e2e         # Run end-to-end tests

# Database
npm run db:seed          # Seed database with sample data
npm run db:migrate       # Run database migrations
```

#### Client Scripts

```bash
cd client

# Development
npm start                # Start dev server (Port 3000)
npm run build            # Build for production

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
npm run format           # Format code with Prettier
npm run typecheck        # Run TypeScript type checking

# Testing
npm test                 # Run tests
npm run test:coverage    # Run tests with coverage
```

### Development Workflow

1. **Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Make Changes**
```bash
# Edit files
# The development server will auto-reload
```

3. **Commit**
```bash
git add .
git commit -m "feat: add new feature"
```

4. **Push**
```bash
git push origin feature/your-feature-name
```

### Code Style Guidelines

- **ESLint** + **Prettier** for consistent formatting
- **TypeScript Strict Mode** enabled
- Follow **Airbnb JavaScript Style Guide**
- Use **meaningful variable names**
- Write **JSDoc comments** for public APIs
- Keep functions **small and focused**
- Follow **SOLID principles**

### Git Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix bug in payment flow
docs: update README
style: format code
refactor: restructure order service
test: add unit tests for auth
chore: update dependencies
```

---

## Testing

### Unit Tests

```bash
# Server tests
cd server
npm test

# Client tests
cd client
npm test
```

### Integration Tests

```bash
cd server
npm run test:e2e
```

### Test Coverage

```bash
# Server coverage
cd server
npm test -- --coverage

# Client coverage
cd client
npm run test:coverage
```

---

## Deployment

### Production Build

#### Build Both Applications

```bash
# Build server
cd server
npm run build

# Build client
cd client
npm run build
```

#### Start with Docker Compose

```bash
docker-compose -f docker/docker-compose.yml up -d
```

### Environment Variables for Production

**Critical: Update these values in production!**

```bash
# Security
JWT_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>
SESSION_SECRET=<generate-strong-secret>

# Database
MONGODB_URI=mongodb://<user>:<password>@<host>:<port>/<database>

# Enable HTTPS
CORS_ORIGIN=https://yourdomain.com

# Production URLs
CLIENT_URL=https://yourdomain.com
API_BASE_URL=https://api.yourdomain.com
```

### Security Checklist

- [ ] Change all default passwords
- [ ] Update JWT secrets with strong random values
- [ ] Enable HTTPS (SSL/TLS certificates)
- [ ] Configure CORS to allow only trusted origins
- [ ] Enable rate limiting on API endpoints
- [ ] Set up monitoring (Sentry, Datadog, etc.)
- [ ] Configure automated backups for MongoDB
- [ ] Review and update all API keys
- [ ] Enable firewall rules
- [ ] Set up CI/CD pipeline
- [ ] Configure logging and alerts

### Cloud Deployment Options

- **AWS**: EC2, ECS, Lambda, RDS, S3
- **Google Cloud**: Compute Engine, Cloud Run, Cloud Storage
- **Azure**: App Service, Container Instances, Blob Storage
- **DigitalOcean**: Droplets, App Platform, Spaces
- **Heroku**: Easy deployment for small-scale applications

---

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Write tests** for new functionality
5. **Ensure all tests pass**
   ```bash
   npm test
   ```
6. **Commit your changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
7. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open a Pull Request**

### Contribution Guidelines

- Follow the existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation as needed
- Ensure CI/CD pipeline passes

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## Authors

**Live MART Development Team**

CS F213/MAC F212 - Object-Oriented Programming Project
BITS Pilani

---

## Acknowledgments

- BITS Pilani for project requirements and guidance
- Open source community for amazing tools and libraries
- All contributors and team members
- Instructors and teaching assistants

---

## Support

For questions, issues, or feature requests:

- **GitHub Issues**: [Create an issue](https://github.com/yourusername/assignmentoops2/issues)
- **Email**: support@livemart.com
- **Documentation**: See `/docs` folder

---

## Quick Start Cheat Sheet

```bash
# Clone repository
git clone <repository-url>
cd assignmentoops2

# Copy environment file
cp .env.example .env.development

# Start with Docker (easiest)
docker-compose -f docker/docker-compose.dev.yml up -d

# Access the app
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# Health:   http://localhost:5000/api/health

# View logs
docker-compose -f docker/docker-compose.dev.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.dev.yml down
```

---

**Built with ❤️ for CS F213/MAC F212 OOP Course**

For more detailed documentation, see the `/docs` directory.
