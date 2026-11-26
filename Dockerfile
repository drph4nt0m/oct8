# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

COPY src ./src
COPY scripts ./scripts

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
# We might need the scripts if we want to run updates in the container, 
# but for now let's just copy the dist for the main app.
# If we want to run update-db, we need the script and tsx or compile it.
# Simpler: copy scripts and install tsx in prod or compile scripts too.
# For this MVP, let's assume DBs are mounted or updated via a separate process/init container.
# But let's copy scripts just in case we want to run them manually.
COPY --from=builder /usr/src/app/scripts ./scripts

EXPOSE 3000

CMD ["npm", "start"]
