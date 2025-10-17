# Add Your Google API Key

## Quick Instructions

1. **Open the file:**
   ```bash
   nano /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api/start-local.sh
   ```

2. **Find line 14:**
   ```bash
   export GOOGLE_API_KEY=${GOOGLE_API_KEY:-"YOUR_GOOGLE_API_KEY_HERE"}
   ```

3. **Replace `YOUR_GOOGLE_API_KEY_HERE` with your actual Google API key**

4. **Save and exit:**
   - Press `Ctrl+X`
   - Press `Y` to confirm
   - Press `Enter` to save

---

## Alternative: Use Environment Variable

Or set it in your shell before running:

```bash
export GOOGLE_API_KEY="your-actual-key-here"
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
bash start-local.sh
```

---

## Verify Setup

After adding the key, verify it's set:

```bash
cd /Users/robertford/Desktop/cerply-cursor-starter-v2-refresh/api
source start-local.sh
echo "Google API Key: ${GOOGLE_API_KEY:0:10}..."
```

You should see the first 10 characters of your key.

---

**Once you've added your Google API key, tell me "Key added" and I'll restart the API server!**

