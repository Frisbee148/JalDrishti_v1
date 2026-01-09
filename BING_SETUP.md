# How to Get Your Bing Search Key

Since "Bing Search v7" was renamed, follow these exact steps to find your key:

## Step 1: Create the Resource
1. Go to the [Azure Portal](https://portal.azure.com/).
2. In the top search bar, type: **Bing Search**.
3. Click on **Bing Search** (Marketplace).
4. Click **Create**.
5. Fill in the details:
   - **Name**: `jaldrishti-search` (or similar).
   - **Pricing Tier**: Select **F1 (Free)** if available, or **S1**.
   - **Resource Group**: Use the same one as before (e.g., `JalDrishti-RG`).
6. Click **Review + Create**, then **Create**.

## Step 2: Get the Key
1. Once deployed (wait for the notification bell to say "Deployment succeeded"), click **Go to resource**.
2. Look at the **Left Menu** sidebar.
3. Under the **"Resource Management"** section, click on **Keys and Endpoint**.
4. You will see **KEY 1**.
   - Copy this value!

## Step 3: Update Your Project
1. Open your `.env` file.
2. Paste the key:
   ```env
   BING_SEARCH_V7_KEY=paste_your_key_here
   ```
3. Save the file.
4. Restart your backend terminal (CTRL+C, then `python backend/main.py`) for it to take effect.
