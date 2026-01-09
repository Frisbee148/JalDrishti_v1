# How to Get Your Google Vision API Key

If you cannot use Azure, you can use the official **Google Cloud Vision API** to detect if an image is from the web.

## Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the specific project dropdown in the top bar and select **"New Project"**.
3. Name it `JalDrishti` and click **Create**.

## Step 2: Enable the Vision API
1. In the search bar at the top of the console, type **"Cloud Vision API"**.
2. Select it from the Marketplace results.
3. Click **Enable**.
   - *Note: You may need to enable "Billing" for this project. Google gives $300 free credits for new accounts, and the first 1,000 requests per month are typically free.*

## Step 3: Get Your API Key
1. Go to the **"APIs & Services"** > **"Credentials"** page (via the left menu).
2. Click **+ CREATE CREDENTIALS** at the top.
3. Select **API Key**.
4. Your API key will be created (starts with `AIza...`). **Copy this key.**

## Step 4: Update Your Project
1. Open your `.env` file.
2. Add the key:
   ```env
   GOOGLE_VISION_KEY=paste_your_key_here
   ```
3. Save the file.
4. Restart the backend: `python backend/main.py`.

The system is now pre-configured to automatically check this API if the key works!
