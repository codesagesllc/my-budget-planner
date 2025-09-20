# PocketWiseAI

A comprehensive personal finance management application built with Next.js, Supabase, Plaid, and Anthropic AI.

## Features

- 🏦 **Bank Account Integration** - Securely connect bank accounts via Plaid
- 📊 **Smart Bill Management** - Upload spreadsheets and let AI extract bill information
- 🤖 **AI Financial Insights** - Get personalized advice powered by Anthropic's Claude
- 💰 **Budget Tracking** - Monitor spending patterns and set savings goals
- 🔒 **Secure & Private** - Bank-level security with Supabase RLS
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **AI**: Anthropic Claude (via Vercel AI SDK)
- **Banking**: Plaid API
- **Hosting**: Vercel

## Prerequisites

Before you begin, ensure you have:
- Node.js 18+ installed
- A Supabase account and project
- A Plaid account (sandbox for development)
- An Anthropic API key
- A Vercel account (for deployment)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd pocketwise-ai
npm install
```

### 2. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migration script in your Supabase SQL editor:
   - Go to SQL Editor in your Supabase dashboard
   - Copy the contents of `supabase/migrations/001_initial_schema.sql`
   - Run the SQL script

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Update `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Plaid (already configured for sandbox)
PLAID_CLIENT_ID=68a75bb19009c300280ac2d2
PLAID_SECRET=bf9c138604472a806c192c7ed6bf41
PLAID_ENV=sandbox

# Anthropic AI
ANTHROPIC_API_KEY=your_anthropic_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Get Your API Keys

#### Supabase
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy your Project URL, anon key, and service role key

#### Anthropic
1. Sign up at [anthropic.com](https://www.anthropic.com)
2. Go to your API settings
3. Create and copy your API key

#### Plaid (Optional - Sandbox credentials provided)
- The sandbox credentials are already configured
- For production, get your own at [plaid.com](https://plaid.com)

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage Guide

### Getting Started
1. Sign up for a new account
2. Connect your bank accounts using Plaid Link
3. Upload your bills spreadsheet or use the template
4. View your dashboard for insights and tracking

### Bill Upload Template
- Download the Excel template from the Bills tab
- Fill in your recurring bills
- Upload the file - AI will automatically parse it

### AI Insights
- Navigate to the Insights tab
- Set optional savings goals
- Click "Generate Insights" for personalized advice

## Project Structure

```
pocketwise-ai/
├── app/                  # Next.js app directory
│   ├── api/             # API routes
│   ├── (auth)/          # Authentication pages
│   └── dashboard/       # Dashboard pages
├── components/          # React components
├── lib/                 # Utilities and clients
│   ├── ai/             # AI integration
│   ├── plaid/          # Plaid client
│   └── supabase/       # Supabase clients
├── supabase/           # Database migrations
└── types/              # TypeScript types
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

```bash
vercel --prod
```

## Security Considerations

- All user data is isolated using Supabase RLS
- Plaid tokens are encrypted and stored securely
- API keys should never be exposed to the client
- Use environment variables for all sensitive data

## Troubleshooting

### Common Issues

1. **Supabase connection errors**
   - Verify your Supabase URL and keys
   - Check if RLS policies are properly set

2. **Plaid not connecting**
   - Ensure you're using sandbox mode for development
   - Check Plaid client ID and secret

3. **AI not generating insights**
   - Verify your Anthropic API key
   - Check API rate limits

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please open a GitHub issue or contact support.

---

Built with ❤️ using Next.js, Supabase, and AI
