# Brick Bot - Dockerfile for Railway deployment
FROM node:20-slim

# Install ffmpeg for video processing (currently disabled but ready for future use)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json pnpm-lock.yaml* ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Set environment to production
ENV NODE_ENV=production

# Run Brick
CMD ["node", "brick.js"]
