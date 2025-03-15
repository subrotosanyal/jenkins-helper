# ---------- Build Frontend ----------
FROM node:16 as frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---------- Build Backend ----------
FROM node:16 as backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Copy the frontend build from the frontend-builder stage to the backend's static folder
RUN mkdir -p /app/backend/static
COPY --from=frontend-builder /app/frontend/build /app/backend/static

# ---------- Final Image ----------
FROM node:16
WORKDIR /app/backend
COPY --from=backend-builder /app/backend .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/index.js"]

