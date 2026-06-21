# AB Inventory & Sales Hub

Internal sales and inventory management system for **AB Card Games**.  
Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

> Made in Ghana, Played Everywhere.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set up the database
In your Supabase dashboard → SQL Editor, run:
```sql
-- 1. Run schema first
\i supabase/schema.sql

-- 2. Run seed data
\i supabase/seed.sql
```

### 4. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Features

| Module | Description |
|---|---|
| **Dashboard** | Revenue today/week/month, stock levels, delivery summary, best seller, recent sales |
| **Inventory** | Add/reduce/edit stock for all 5 editions with reorder alerts |
| **Sales** | Fast 3-step sale entry (< 15 seconds), multi-product support, filter & search |
| **Deliveries** | Track dispatch status, update delivery progress, filter by status |
| **Customers** | Customer database with purchase history, top customer highlight |
| **Reports** | Revenue trends, edition performance, channel & payment breakdown charts |

## Products

| SKU | Name | Default Price |
|---|---|---|
| SSG-001 | Say Something Ghana Edition | GHS 89 |
| SSG-002 | Say Something Global Edition | GHS 99 |
| SSG-003 | Say Something Spicy Edition | GHS 99 |
| SSG-004 | Say Something Christian Edition | GHS 89 |
| SSG-005 | Say Something Complete Edition | GHS 299 |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (black/white/gold brand palette)
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **Charts**: Chart.js + react-chartjs-2
- **Icons**: Lucide React
- **Notifications**: react-hot-toast

## Project Structure

```
ab-card-games/
├── app/
│   ├── page.tsx              # Dashboard
│   ├── inventory/page.tsx    # Inventory management
│   ├── sales/
│   │   ├── page.tsx          # Sales list
│   │   └── new/page.tsx      # New sale form (3-step)
│   ├── deliveries/page.tsx   # Delivery tracking
│   ├── customers/page.tsx    # Customer database
│   └── reports/page.tsx      # Analytics & charts
├── components/
│   ├── layout/               # AppLayout, Sidebar, Header
│   ├── dashboard/            # RevenueChart
│   └── ui/                   # Badge, Modal, StatsCard
├── lib/
│   ├── types.ts              # All TypeScript types
│   ├── supabase.ts           # Supabase client
│   ├── mockData.ts           # Demo data (mirrors seed.sql)
│   └── utils.ts              # Formatting & helpers
└── supabase/
    ├── schema.sql            # Full DB schema with RLS
    └── seed.sql              # Sample data
```

## Deployment

### Vercel (recommended)
```bash
npm run build
vercel --prod
```

Set environment variables in Vercel dashboard.

### Self-hosted
```bash
npm run build
npm start
```

## Connecting Supabase

The app works with mock data out of the box. To use real Supabase data:

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Run `supabase/seed.sql` to load demo data
4. Copy your project URL and anon key to `.env.local`
5. Replace mock data calls in each page with Supabase queries

### Example Supabase query (replacing mock data)
```typescript
const supabase = getSupabaseClient()
const { data: products } = await supabase
  .from('products')
  .select('*')
  .order('name')
```

## Future Modules (Roadmap)

- [ ] Authentication (Supabase Auth)
- [ ] Distributor & retail partner tracking  
- [ ] QR code order lookup
- [ ] Barcode scanning (camera API)
- [ ] WhatsApp order integration
- [ ] E-commerce storefront sync
- [ ] Accounting / invoice export
- [ ] Multi-warehouse support
- [ ] Sales agent performance dashboard
- [ ] Bulk CSV import/export
