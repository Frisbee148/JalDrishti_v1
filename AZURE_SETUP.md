# How to Get Your Azure Computer Vision Key and Endpoint

To enable the powerful AI analysis features in JalDrishti, you need an API Key and Endpoint from Microsoft Azure. Follow these steps:

## Step 1: Sign in to Azure
Go to the [Azure Portal](https://portal.azure.com/) and sign in with your Microsoft account. If you don't have one, you can create a free account.

## Step 2: Create a Computer Vision Resource
1. In the search bar at the top, type **"Computer Vision"** and select it from the "Marketplace" or "Services" list.
    - *Note: It might also be listed under "Azure AI services" -> "Computer Vision".*
2. Click **+ Create**.
3. Fill in the details:
    - **Subscription**: Select your subscription (e.g., "Azure subscription 1" or "Free Trial").
    - **Resource Group**: Click "Create new" and name it something like `JalDrishti-RG`.
    - **Region**: Choose a region close to you (e.g., `East US`, `Central India`).
    - **Name**: Give it a unique name, e.g., `jaldrishti-vision-yourname`.
    - **Pricing Tier**: Select **Free F0** (if available) or **Standard S1**.
4. Click **Review + create**, then click **Create**.
5. Wait a minute for the deployment to finish.

## Step 3: Get Your Keys and Endpoint
1. Once deployed, click **Go to resource**.
2. In the left-hand menu, look under the **"Resource Management"** section (usually near the bottom).
3. Click on **"Keys and Endpoint"**.
4. You will see:
    - **KEY 1**: This is your `AZURE_CV_KEY`. (You can use Key 1 or Key 2).
    - **Endpoint**: This is your `AZURE_CV_ENDPOINT` (e.g., `https://jaldrishti-vision.cognitiveservices.azure.com/`).

## Step 4: Update Your Project
1. Open the `.env` file in your `JalDrishti1.0` folder.
2. Paste the values you just copied:
   ```env
   AZURE_CV_KEY=your_copied_key_here
   AZURE_CV_ENDPOINT=your_copied_endpoint_here
   ```
3. Save the file.
4. The backend will need to be restarted to pick up the changes.
