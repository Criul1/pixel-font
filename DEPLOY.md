# How to Deploy Pixel Font Generator Online

This guide shows you how to deploy your pixel font generator to various free hosting platforms.

## Option 1: GitHub Pages (Recommended - Free & Easy)

### Steps:

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add offline pixel font generator"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your GitHub repository
   - Click on **Settings** tab
   - Scroll down to **Pages** section (in left sidebar)
   - Under **Source**, select **Deploy from a branch**
   - Choose **main** branch and **/ (root)** folder
   - Click **Save**

3. **Your site will be live at**:
   `https://YOUR_USERNAME.github.io/pixel-font/fontgenerator.html`

4. **Optional - Make it the default page**:
   - Rename `fontgenerator.html` to `index.html` (or update the existing `index.html` to redirect)

## Option 2: Netlify (Free & Easy)

### Steps:

1. **Go to [netlify.com](https://www.netlify.com)** and sign up/login

2. **Drag and Drop Method**:
   - Drag your entire project folder onto Netlify's dashboard
   - Your site will be live instantly!

3. **Or use Git**:
   - Connect your GitHub repository
   - Netlify will auto-deploy on every push

4. **Configure**:
   - **Publish directory**: `/` (root)
   - **Build command**: (leave empty - no build needed)
   - **Main file**: `fontgenerator.html`

## Option 3: Vercel (Free & Easy)

### Steps:

1. **Go to [vercel.com](https://vercel.com)** and sign up/login

2. **Import your GitHub repository**

3. **Configure**:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: (leave empty)
   - Output Directory: `./`

4. **Deploy!**

## Option 4: Cloudflare Pages (Free)

### Steps:

1. **Go to [pages.cloudflare.com](https://pages.cloudflare.com)**

2. **Connect your GitHub repository**

3. **Build settings**:
   - Framework preset: **None**
   - Build command: (leave empty)
   - Build output directory: `/`

4. **Deploy!**

## Quick Setup: Update index.html for Better UX

You can update `index.html` to automatically redirect to `fontgenerator.html` or serve it directly.

### Option A: Redirect
```html
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=fontgenerator.html">
    <title>Pixel Font Generator</title>
</head>
<body>
    <p>Redirecting to <a href="fontgenerator.html">Pixel Font Generator</a>...</p>
</body>
</html>
```

### Option B: Copy fontgenerator.html to index.html
Just copy the contents of `fontgenerator.html` to `index.html` so it loads automatically.

## Files Needed for Deployment

Make sure these files are in your repository:
- ✅ `fontgenerator.html` (main file)
- ✅ `script.js` (JavaScript)
- ✅ `fonts_data.js` (font data)
- ✅ `styles.css` (optional, styles are embedded)

## Testing Locally Before Deploying

You can test locally using a simple HTTP server:

### Python:
```bash
python -m http.server 8000
```

### Node.js:
```bash
npx http-server
```

### PHP:
```bash
php -S localhost:8000
```

Then visit `http://localhost:8000/fontgenerator.html`

## Troubleshooting

- **404 errors**: Make sure all file paths are relative (not absolute)
- **Fonts not loading**: Verify `fonts_data.js` is in the same directory
- **CORS issues**: Shouldn't happen with static files, but if it does, use a proper web server

## Recommended: GitHub Pages

GitHub Pages is the easiest option since you already have a GitHub repository. Just enable it in Settings → Pages!

