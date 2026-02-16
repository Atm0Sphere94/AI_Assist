# Creating GitHub Repository

To push your code to GitHub, follow these steps:

## 1. Create GitHub Repository

Go to https://github.com/new and create a new repository:
- **Repository name**: `AI_Assist`
- **Description**: "AI Jarvis - Personal AI Assistant with Telegram integration, RAG, and cloud storage"
- **Visibility**: Private (or Public, your choice)
- **DO NOT** initialize with README, .gitignore, or license (we already have these)

## 2. Link Local Repository to GitHub

```bash
cd /Users/a1m0sphere/Documents/AI_Jarvis

# Add GitHub remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/AI_Assist.git

# Push main branch
git push -u origin main

# Push dev branch
git checkout dev
git push -u origin dev

# Return to main
git checkout main
```

## 3. Verify on GitHub

Visit `https://github.com/YOUR_USERNAME/AI_Assist` to see your code.

Both `main` and `dev` branches should be visible.

---

## Alternative: Using GitHub CLI

If you have GitHub CLI installed:

```bash
cd /Users/a1m0sphere/Documents/AI_Jarvis

# Create repository on GitHub
gh repo create AI_Assist --private --source=. --remote=origin

# Push both branches
git push -u origin main
git push -u origin dev
```

---

## Repository Structure

```
AI_Assist/
├── main (branch) - Production-ready code
└── dev (branch) - Development & testing
```

**Workflow:**
1. Develop features in `dev` branch
2. Test thoroughly
3. Merge to `main` when stable
4. Deploy from `main` branch

---

**After creating the repository, run the commands above to push your code!**
