#!/bin/bash
# DDEx Companion — GitHub setup script
# Run this from inside your cloned repo directory

echo "📦 Installing dependencies..."
npm install

echo "🔑 Creating .env file..."
cat > .env << 'ENVEOF'
VITE_OPENROUTER_KEY=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
ENVEOF

echo "🚀 Starting dev server..."
npm run dev
