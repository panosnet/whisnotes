# 📝 Documentation Update Checklist

Use this checklist **after every coding session** to keep documentation current.

---

## ✅ After Making Code Changes

### 1. Update STATUS.md (ALWAYS)
- [ ] Move completed items from "Not Started" to "Complete"
- [ ] Update "In Progress" section
- [ ] Update statistics (files, lines of code, etc.)
- [ ] Add to "Recent Changes" section
- [ ] Update "Known Issues" if bugs found/fixed
- [ ] Update implementation status percentages

### 2. Update TODO.md (ALWAYS)
- [ ] Check off completed tasks
- [ ] Add newly discovered tasks
- [ ] Adjust priorities if needed
- [ ] Update "Current Sprint" section
- [ ] Note any blockers

### 3. Update CHANGELOG.md (For Significant Changes)
- [ ] Add entry under [Unreleased] section
- [ ] Categorize: Added, Changed, Fixed, Removed
- [ ] Note any breaking changes
- [ ] Update version if releasing

### 4. Update ARCHITECTURE.md (If Architecture Changed)
- [ ] Update data flow diagrams
- [ ] Update file structure tree
- [ ] Update technical decisions
- [ ] Update database schema if changed
- [ ] Update API surface if IPC changed

### 5. Update README.md (If User Features Changed)
- [ ] Update feature list
- [ ] Update installation instructions
- [ ] Update usage examples
- [ ] Update screenshots/demos
- [ ] Update cost estimates

### 6. Update QUICKSTART.md (If Setup Changed)
- [ ] Update prerequisites
- [ ] Update installation steps
- [ ] Update first-run instructions
- [ ] Update troubleshooting section

### 7. Update PROJECT_OVERVIEW.md (If Structure Changed)
- [ ] Update file tree
- [ ] Update statistics (file count, etc.)
- [ ] Update status indicators (✅⚠️❌)
- [ ] Update completeness percentage

---

## 🎯 Priority Levels

**Must Update Every Session:**
- ✅ STATUS.md
- ✅ TODO.md
- ✅ CHANGELOG.md (if significant)

**Update When Relevant:**
- ARCHITECTURE.md (architectural changes)
- README.md (user-facing changes)
- QUICKSTART.md (setup changes)
- PROJECT_OVERVIEW.md (structure changes)

---

## 💡 Quick Template

**For STATUS.md "Recent Changes":**
```markdown
**YYYY-MM-DD - [Description]**
- Implemented [feature]
- Fixed [bug]
- Added [component]
- Updated [system]
```

**For CHANGELOG.md:**
```markdown
### Added
- New feature X

### Changed
- Modified behavior of Y

### Fixed
- Bug in Z

### Removed
- Deprecated feature W
```

---

## 🔍 Verification

Before ending a session, verify:
- [ ] STATUS.md accurately reflects current state
- [ ] TODO.md shows correct next steps
- [ ] All new files added to PROJECT_OVERVIEW.md
- [ ] No "TODO" comments left in documentation
- [ ] Dates are current (YYYY-MM-DD format)

---

**Remember:** Future you (and future AI) will thank you for good docs! 📚
