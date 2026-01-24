# Deployment Guide

## Quick Start (Development)

### Prerequisites
- Node.js v18 or higher
- npm v9 or higher
- Modern web browser (Chrome, Firefox, Edge, Safari)

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/jawher171/pfe-inventaire.git
cd pfe-inventaire
```

2. **Install dependencies**
```bash
npm install
```

3. **Start development server**
```bash
npm start
```

4. **Open your browser**
Navigate to `http://localhost:4200`

## Available Scripts

```bash
# Start development server with hot reload
npm start

# Build for production
npm run build

# Run unit tests
npm test

# Run linter
npm run lint
```

## Production Build

### Build the application
```bash
npm run build
```

The production-ready files will be in the `dist/inventory-app/` directory.

### Build Output
- Optimized JavaScript bundles
- Minified CSS
- Lazy-loaded chunks for better performance
- All assets optimized and compressed

## Deployment Options

### 1. Static Hosting (Recommended for Demo)

#### Netlify
1. Push your code to GitHub
2. Connect Netlify to your repository
3. Build command: `npm run build`
4. Publish directory: `dist/inventory-app/browser`
5. Deploy!

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts
4. Done!

#### GitHub Pages
```bash
# Install angular-cli-ghpages
npm install -g angular-cli-ghpages

# Build and deploy
ng build --configuration production --base-href="/pfe-inventaire/"
npx angular-cli-ghpages --dir=dist/inventory-app/browser
```

#### Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase
firebase init hosting

# Deploy
firebase deploy
```

### 2. Docker Deployment

Create a `Dockerfile`:
```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist/inventory-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Build and run:
```bash
docker build -t inventory-app .
docker run -p 8080:80 inventory-app
```

### 3. Cloud Platforms

#### AWS S3 + CloudFront
1. Build the app: `npm run build`
2. Create an S3 bucket
3. Upload `dist/inventory-app/browser/*` to S3
4. Enable static website hosting
5. Create CloudFront distribution
6. Point CloudFront to your S3 bucket

#### Azure Static Web Apps
1. Push code to GitHub
2. Create Azure Static Web App
3. Configure build:
   - App location: `/`
   - API location: `` (leave empty)
   - Output location: `dist/inventory-app/browser`

#### Google Cloud Platform
```bash
# Install Google Cloud SDK
gcloud init

# Create App Engine application
gcloud app create

# Create app.yaml
# Deploy
gcloud app deploy
```

## Environment Configuration

### Development
- API URL: `http://localhost:3000` (if using backend)
- Enable source maps
- Hot module replacement

### Production
- API URL: Production API endpoint
- Disable source maps
- Enable AOT compilation
- Enable optimization

### Environment Files

Create `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

Create `src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com/api'
};
```

## Backend Integration

Currently, the app uses mock data. To integrate with a real backend:

1. **Update Services**
   - Replace mock data with HTTP calls
   - Use Angular's HttpClient
   - Add error handling

2. **Configure CORS**
   - Allow requests from your frontend domain
   - Configure authentication headers

3. **API Endpoints**
   ```
   GET    /api/products
   POST   /api/products
   PUT    /api/products/:id
   DELETE /api/products/:id
   GET    /api/categories
   GET    /api/suppliers
   GET    /api/orders
   POST   /api/auth/login
   POST   /api/auth/logout
   ```

## Performance Optimization

### Already Implemented
- Lazy loading of routes
- OnPush change detection (can be added)
- Production build optimization
- Code splitting

### Additional Optimizations
1. **Enable Service Worker**
```bash
ng add @angular/pwa
```

2. **Implement Virtual Scrolling** for large lists
```typescript
import { ScrollingModule } from '@angular/cdk/scrolling';
```

3. **Add HTTP Caching**
```typescript
// Implement HTTP interceptor for caching
```

## Security Considerations

### Before Production
1. **Enable HTTPS** - Always use SSL/TLS
2. **Configure CSP** - Content Security Policy headers
3. **Implement Rate Limiting** - Protect against DDoS
4. **Add Authentication** - Integrate with OAuth/JWT
5. **Sanitize Inputs** - Prevent XSS attacks
6. **Update Dependencies** - Keep packages up-to-date

### Headers to Add
```
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000
```

## Monitoring & Analytics

### Google Analytics
Add to `index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

### Error Tracking
Consider integrating:
- Sentry
- Rollbar
- LogRocket

## Troubleshooting

### Common Issues

1. **Build fails with font errors**
   - Solution: Fonts are disabled in optimization settings

2. **404 on page refresh**
   - Solution: Configure server to redirect all routes to index.html

3. **API calls fail**
   - Check CORS configuration
   - Verify API endpoint URLs
   - Check authentication headers

4. **Slow initial load**
   - Enable gzip compression
   - Implement lazy loading
   - Add service worker

## Maintenance

### Regular Tasks
- Update dependencies monthly: `npm update`
- Check for security vulnerabilities: `npm audit`
- Monitor bundle sizes
- Review and update documentation
- Backup database (when using backend)

## Support

For issues or questions:
- Check the README.md
- Review DESIGN.md for design decisions
- Check Angular documentation: https://angular.dev
- Check Material Design guidelines: https://material.io

---

**Last Updated**: January 2024
**Version**: 1.0.0
