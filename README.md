# 🧁 Tejesh Bakery Website — Setup Guide

## Files Included
| File | Purpose |
|------|---------|
| `index.html` | Customer-facing website |
| `style.css` | Customer website styles |
| `app.js` | Customer website JavaScript |
| `admin.html` | Admin dashboard |
| `admin.css` | Admin dashboard styles |
| `admin.js` | Admin dashboard JavaScript |
| `supabase_setup.sql` | Database setup script |

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project**
3. Name it `tejesh-bakery`, choose a region close to India (e.g., Singapore)
4. Set a strong database password and click **Create Project**

---

## Step 2: Set Up Database

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy and paste the entire contents of `supabase_setup.sql`
4. Click **Run** — this creates your tables and seeds all menu items from the photo

---

## Step 3: Get Your API Keys

1. Go to **Settings → API** in Supabase
2. Copy:
   - **Project URL** (looks like `https://abcdefg.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

## Step 4: Add Keys to Website Files

Open **`app.js`** and replace lines 7–8:
```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

Open **`admin.js`** and replace lines 7–8 the same way.

---

## Step 5: Create Admin Account

1. In Supabase, go to **Authentication → Users**
2. Click **Invite User** or **Add User**
3. Enter your email (e.g., `admin@tejeshbakery.com`) and a strong password
4. Use these credentials to log into `admin.html`

---

## Step 6: Deploy Website

### Option A: Netlify (Free & Easiest)
1. Go to [netlify.com](https://netlify.com), sign up free
2. Drag and drop the entire `tejesh-bakery` folder into Netlify
3. Your site is live instantly with a free URL!
4. Optionally buy a custom domain like `tejeshbakery.com`

### Option B: GitHub Pages
1. Create a GitHub account and new repository
2. Upload all files
3. Go to Settings → Pages → Enable GitHub Pages

### Option C: Hostinger / GoDaddy
Upload all 6 files via File Manager in your hosting control panel.

---

## How to Use the Admin Panel

### Managing Products (Menu)
- Go to `yoursite.com/admin.html`
- Log in with your Supabase email/password
- **Products tab**: Add, edit, hide/show, or delete menu items
- Upload images by hosting them (e.g., Cloudinary free) and pasting the URL

### Managing Orders
- **Orders tab**: See all incoming orders in real-time
- Change order status with the dropdown (Pending → Confirmed → Preparing → Out for Delivery → Delivered)
- Click 💬 to send the customer a WhatsApp message directly
- Click 👁 to see full order details

### Dashboard
- View today's orders, revenue, and pending count at a glance

---

## Customer Flow
1. Customer visits website → browses menu by category
2. Adds items to cart (by weight: ¼kg, ½kg, 1kg — or per piece for biscuits)
3. Fills in name, phone, WhatsApp, and address
4. Clicks "Place Order" → order saved to database
5. WhatsApp opens with order summary to send to your number
6. Customer can track order status at any time using their phone number

---

## WhatsApp Numbers Configured
- Primary: **8825725372**
- Alternate: **9597619181**
- Instagram: `@Tejesh_home_bakery_id`

---

## Updating Your Menu Later
Just log into the Admin panel and:
- Add new products with prices
- Hide seasonal items without deleting them
- Upload product photos via image URL

---

*Built for Tejesh Bakery, Salem, Tamil Nadu 🧁*
