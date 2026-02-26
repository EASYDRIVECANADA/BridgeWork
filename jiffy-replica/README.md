# Jiffy On Demand Replica

A complete full-stack replica of the Jiffy On Demand platform - an on-demand home maintenance service connecting homeowners with certified professionals.

## 🏗️ Architecture Overview

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │
         │ REST API + WebSocket
         │
┌────────▼────────┐      ┌──────────────────┐
│  Express API    │◄────►│    Supabase      │
│   (Backend)     │      │  - PostgreSQL    │
└─────────────────┘      │  - Auth (JWT)    │
                         │  - Storage       │
                         │  - Realtime      │
                         └──────────────────┘
```

## 🚀 Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Redux Toolkit
- **Backend**: Node.js, Express.js, Supabase Client
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (JWT-based)
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage
- **Payments**: Stripe (integrated)
- **Testing**: Jest, React Testing Library
- **Deployment**: Vercel (Frontend), Railway/Render (Backend)

## 📋 Features

### User Features
- ✅ User registration and authentication (email/password, OAuth)
- ✅ Service search with autocomplete
- ✅ Browse service categories (Handyman, Repairs, Lawn Care, etc.)
- ✅ Book services with date/time selection
- ✅ Real-time pro matching (10-minute response goal)
- ✅ Live job tracking and status updates
- ✅ In-app messaging with pros
- ✅ Payment processing with Stripe
- ✅ Review and rating system
- ✅ Job history and receipts

### Pro Features
- ✅ Pro registration with certification upload
- ✅ Job queue dashboard
- ✅ Accept/decline job requests
- ✅ Real-time notifications
- ✅ Earnings tracking
- ✅ Profile management

### Admin Features
- ✅ Manage users and pros
- ✅ Service category management
- ✅ Review moderation
- ✅ Analytics dashboard

## 🔐 Security Features

- JWT-based authentication with refresh tokens
- Row-Level Security (RLS) policies in Supabase
- Input validation and sanitization
- SQL injection prevention
- XSS protection with helmet.js
- CSRF protection
- Rate limiting
- HTTPS enforcement
- Encrypted sensitive data (AES-256)
- GDPR compliance

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account
- Stripe account (for payments)
- Git

### 1. Clone Repository

```bash
git clone <repository-url>
cd jiffy-replica
```

### 2. Supabase Setup

Your Supabase credentials:
- **URL**: https://ndxauksylgoxtdoxwsjk.supabase.co
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

#### Run Database Migrations

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref ndxauksylgoxtdoxwsjk

# Run migrations
cd database/migrations
supabase db push
```

Or manually execute SQL files in Supabase SQL Editor:
1. Go to https://app.supabase.com/project/ndxauksylgoxtdoxwsjk/editor
2. Run files in order: `001_initial_schema.sql`, `002_rls_policies.sql`, `003_seed_data.sql`

### 3. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
NODE_ENV=development

SUPABASE_URL=https://ndxauksylgoxtdoxwsjk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=your_service_role_key_here

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key

FRONTEND_URL=http://localhost:3000
```

Start backend:
```bash
npm run dev
```

Backend runs on: http://localhost:5000

### 4. Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://ndxauksylgoxtdoxwsjk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Start frontend:
```bash
npm run dev
```

Frontend runs on: http://localhost:3000

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
npm run test:coverage
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:coverage
```

### E2E Tests
```bash
npm run test:e2e
```

## 📁 Project Structure

```
jiffy-replica/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   ├── validators/      # Input validation
│   │   └── server.js        # Entry point
│   ├── tests/               # Backend tests
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app directory
│   │   ├── components/      # React components
│   │   ├── store/           # Redux store
│   │   ├── lib/             # Utilities
│   │   ├── hooks/           # Custom hooks
│   │   └── styles/          # Global styles
│   ├── public/              # Static assets
│   ├── .env.example
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── database/
│   ├── migrations/          # SQL migration files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_seed_data.sql
│   └── README.md
│
├── docs/
│   ├── API.md               # API documentation
│   ├── ARCHITECTURE.md      # Architecture details
│   └── DEPLOYMENT.md        # Deployment guide
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml        # GitHub Actions
│
├── docker-compose.yml       # Local development with Docker
└── README.md
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Services
- `GET /api/services` - List all services
- `GET /api/services/:id` - Get service details
- `GET /api/services/search?q=query` - Search services
- `GET /api/services/categories` - Get service categories

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `PATCH /api/bookings/:id` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking

### Pros
- `GET /api/pros/nearby?lat=xx&lon=yy` - Find nearby pros
- `GET /api/pros/:id` - Get pro profile
- `POST /api/pros/apply` - Apply to become a pro
- `GET /api/pros/jobs` - Get pro's job queue (pro only)
- `PATCH /api/pros/jobs/:id/accept` - Accept job (pro only)
- `PATCH /api/pros/jobs/:id/decline` - Decline job (pro only)

### Reviews
- `POST /api/reviews` - Submit review
- `GET /api/reviews/:bookingId` - Get reviews for booking
- `GET /api/pros/:proId/reviews` - Get pro's reviews

### Payments
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/webhook` - Stripe webhook

### Admin
- `GET /api/admin/users` - List users (admin only)
- `GET /api/admin/pros` - List pros (admin only)
- `PATCH /api/admin/pros/:id/verify` - Verify pro (admin only)

## 🔄 Real-time Features

Using Supabase Realtime subscriptions:

1. **Booking Status Updates**: Users receive live updates when pros accept/complete jobs
2. **In-app Messaging**: Real-time chat between users and pros
3. **Notifications**: Push notifications for job updates
4. **Pro Dashboard**: Live job queue updates

## 💳 Payment Flow

1. User selects service and books
2. Frontend creates Stripe Payment Intent via API
3. User enters payment details (Stripe Elements)
4. Payment processed and confirmed
5. Booking confirmed, pro notified
6. Funds held until job completion
7. Upon completion, funds released to pro

## 🚀 Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel
```

Environment variables to set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Backend (Railway/Render)

```bash
cd backend
railway up
# or
render deploy
```

Environment variables to set:
- All variables from `.env.example`

### Database (Supabase)

Already hosted at: https://ndxauksylgoxtdoxwsjk.supabase.co

## 📊 Database Schema

### Core Tables

- **users**: User accounts (homeowners and pros)
- **profiles**: Extended user information
- **services**: Available services
- **service_categories**: Service categorization
- **bookings**: Service bookings
- **reviews**: User reviews and ratings
- **messages**: In-app messaging
- **notifications**: User notifications
- **pro_applications**: Pro registration applications
- **transactions**: Payment transactions

See `database/migrations/001_initial_schema.sql` for full schema.

## 🐳 Docker Development

```bash
docker-compose up
```

This starts:
- Frontend on http://localhost:3000
- Backend on http://localhost:5000
- Nginx reverse proxy on http://localhost:80

## 🔧 Development

### Code Style

- ESLint for linting
- Prettier for formatting
- Husky for pre-commit hooks

```bash
npm run lint
npm run format
```

### Git Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "feat: your feature"`
3. Push: `git push origin feature/your-feature`
4. Create Pull Request

## 📝 Environment Variables

### Backend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | https://xxx.supabase.co |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | eyJhbGci... |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | eyJhbGci... |
| `STRIPE_SECRET_KEY` | Stripe secret key | sk_test_... |
| `JWT_SECRET` | JWT signing secret | random_string |

### Frontend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | https://xxx.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | eyJhbGci... |
| `NEXT_PUBLIC_API_URL` | Backend API URL | http://localhost:5000 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | pk_test_... |

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check Supabase status
curl https://ndxauksylgoxtdoxwsjk.supabase.co/rest/v1/

# Verify credentials in .env
```

### CORS Errors

Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL.

### Real-time Not Working

Check Supabase Realtime is enabled for your tables in Supabase Dashboard.

## 📚 Additional Documentation

- [API Documentation](./docs/API.md)
- [Architecture Guide](./docs/ARCHITECTURE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create an issue in GitHub
- Email: support@jiffyreplica.com

## 🙏 Acknowledgments

- Original Jiffy On Demand platform for inspiration
- Supabase for backend infrastructure
- Next.js and React teams
- Open source community

---

**Built with ❤️ by Full-Stack Developers**
