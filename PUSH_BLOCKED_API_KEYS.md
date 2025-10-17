# Push Blocked: API Keys in Git History

**Status:** ✅ All commits ready, ⚠️ Git history needs rewriting  
**Issue:** GitHub Secret Scanning blocking push due to API keys in commit `9f8e2f1`

---

## 🚨 **Problem**

GitHub detected API keys in `api/start-local.sh` (commit 9f8e2f1):
- OpenAI API Key: `sk-proj-L_nR-cqLjAimzL6R1Uv...`
- Anthropic API Key: `sk-ant-api03-FYIU7h5IKu...`
- Google API Key: `AIzaSyCqoiSxceQieH5Zg...`

Even though we removed them in latest commit (ae1b4c8), they're still in git history.

---

## ✅ **What's Complete**

### **All 11 Commits Ready:**
1. ✅ Strategic MVP refocus documentation
2. ✅ Epic 16 - Learning science integration
3. ✅ Database migrations (agent tables)
4. ✅ Epic 13 core services
5. ✅ API routes & frontend integration
6. ✅ Tests & documentation
7. ✅ Batch & PhD content generation
8. ✅ Conversation engine updates
9. ✅ Documentation & status files
10. ✅ TypeScript fixes
11. ✅ API keys removed (but history needs rewriting)

**Total changes:** 96 files, ~20,000 lines

---

## 🔧 **Solution: Rewrite Git History**

### **Option 1: Interactive Rebase (Clean History)** 👍

```bash
# 1. Start interactive rebase from before the problematic commit
git rebase -i 7214250^  # Parent of commit with keys

# 2. In the editor, change 'pick' to 'edit' for commit 9f8e2f1:
#    edit 9f8e2f1 docs: update specs and status tracking [spec]
#    pick c269352 fix(epic13): TypeScript errors in agent-tools
#    pick a82d71d fix(epic13): stub getUserProgress for Epic 14
#    pick ae1b4c8 chore: remove API keys from start-local.sh

# 3. Save and exit

# 4. Edit the file to remove keys
sed -i '' 's/sk-proj-.*$/YOUR_OPENAI_KEY_HERE"/' api/start-local.sh
sed -i '' 's/sk-ant-api03-.*$/YOUR_ANTHROPIC_KEY_HERE"/' api/start-local.sh
sed -i '' 's/AIzaSyC.*$/YOUR_GOOGLE_KEY_HERE"/' api/start-local.sh

# 5. Amend the commit
git add api/start-local.sh
git commit --amend --no-edit

# 6. Continue rebase
git rebase --continue

# 7. Force push (rewrites history)
git push origin HEAD --force-with-lease
```

---

### **Option 2: BFG Repo Cleaner (Fastest)** ⚡

```bash
# 1. Install BFG
brew install bfg  # Mac
# Or download from: https://rtyley.github.io/bfg-repo-cleaner/

# 2. Create replacement file
cat > ~/cerply-replacements.txt << EOF
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==>YOUR_OPENAI_KEY_HERE
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==>YOUR_ANTHROPIC_KEY_HERE
AIzaSyCqoiSxceQieH5ZgJirNi2dUkteLdlkJVk==>YOUR_GOOGLE_KEY_HERE
EOF

# 3. Run BFG
bfg --replace-text ~/cerply-replacements.txt

# 4. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 5. Force push
git push origin HEAD --force-with-lease
```

---

### **Option 3: Allow Keys in GitHub (Easiest, Less Secure)** ⚠️

GitHub provides URLs to allow these specific keys:
- OpenAI: https://github.com/robnreb1/cerply/security/secret-scanning/unblock-secret/34BQTlqMqVgfgYZwfSdRo2a93da
- Anthropic: https://github.com/robnreb1/cerply/security/secret-scanning/unblock-secret/34BQTl0xW5zbgXUbbzyWnitn5bg

**Then:**
```bash
git push origin HEAD
```

**⚠️ WARNING:** These keys are now public in git history. You should:
1. Rotate all 3 API keys immediately
2. Update your local `api/start-local.sh` with new keys

---

## 📋 **Recommended Approach**

### **For MVP Speed: Option 3 + Key Rotation**

1. Click GitHub URLs to allow secrets
2. Push successfully
3. **Immediately rotate all API keys:**
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/settings/keys
   - Google: https://console.cloud.google.com/apis/credentials
4. Update local `api/start-local.sh` with new keys
5. Never commit `start-local.sh` with real keys again

**Time:** 5 minutes + key rotation

---

### **For Clean History: Option 1**

Interactive rebase to remove keys from history completely.

**Time:** 10-15 minutes

---

## 🎯 **Next Steps After Push**

Once push succeeds:

1. ✅ **Verify GitHub shows all commits**
2. → **Rotate API keys** (if using Option 3)
3. → **Create PR** or merge to main
4. → **Update Epic Master Plan** - mark Epic 13 complete
5. → **Start Epic 14**: Manager Module Workflows

---

## 📊 **Epic 13 Summary (Ready to Push)**

| Component | Status |
|-----------|--------|
| Core infrastructure | ✅ 100% |
| Bug fixes | ✅ Complete |
| Documentation | ✅ Complete |
| Commits | ✅ 11 commits ready |
| **Blocker** | ⚠️ API keys in history |

**All technical work is done. Just need to resolve git history issue.**

---

**Recommended:** Use Option 3 (allow secrets) + rotate keys immediately for fastest path to Epic 14.

