# ============================================================================
# STAGE 1: ANALYSIS AND CLEANUP COMMANDS
# ============================================================================
# Run these commands before building Docker images to ensure clean builds

# ============================================================================
# LINUX / MACOS (Bash/Zsh)
# ============================================================================
# Remove all build artifacts, dependencies, and temporary files
rm -rf .next node_modules out build .turbo
rm -rf .cache .parcel-cache
rm -rf coverage .nyc_output test-results
rm -rf tmp temp
rm -f *.log *.tmp *.temp
rm -f .eslintcache .stylelintcache
rm -f *.tsbuildinfo next-env.d.ts
rm -rf prisma/migrations/*.sql.backup

# Clean Supabase local data
rm -rf supabase/.branches supabase/.temp supabase/logs
rm -rf supabase/functions/.local supabase/functions/_remote

# Clean OS temporary files (Linux)
rm -rf /tmp/* 2>/dev/null || true
rm -rf ~/.cache/* 2>/dev/null || true

# Clean OS temporary files (macOS)
rm -rf ~/Library/Caches/* 2>/dev/null || true
rm -rf /var/folders/* 2>/dev/null || true

# ============================================================================
# WINDOWS (PowerShell)
# ============================================================================
# Remove all build artifacts, dependencies, and temporary files
Remove-Item -Recurse -Force .next, node_modules, out, build, .turbo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .cache, .parcel-cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force coverage, .nyc_output, test-results -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force tmp, temp -ErrorAction SilentlyContinue
Remove-Item -Force *.log, *.tmp, *.temp -ErrorAction SilentlyContinue
Remove-Item -Force .eslintcache, .stylelintcache -ErrorAction SilentlyContinue
Remove-Item -Force *.tsbuildinfo, next-env.d.ts -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force prisma\migrations\*.sql.backup -ErrorAction SilentlyContinue

# Clean Supabase local data
Remove-Item -Recurse -Force supabase\.branches, supabase\.temp, supabase\logs -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force supabase\functions\.local, supabase\functions\_remote -ErrorAction SilentlyContinue

# Clean Windows temporary files
Remove-Item -Recurse -Force $env:TEMP\* -ErrorAction SilentlyContinue

# ============================================================================
# PACKAGE.JSON SCRIPTS (Add to package.json)
# ============================================================================
# Add these scripts to your package.json for easy cleanup:
{
  "scripts": {
    "clean": "rm -rf .next node_modules out build .turbo .cache .parcel-cache coverage .nyc_output test-results tmp temp *.log *.tmp *.temp .eslintcache .stylelintcache *.tsbuildinfo next-env.d.ts",
    "clean:full": "npm run clean && rm -rf supabase/.branches supabase/.temp supabase/logs supabase/functions/.local supabase/functions/_remote",
    "clean:deps": "rm -rf node_modules",
    "clean:build": "rm -rf .next out build .turbo"
  }
}

# ============================================================================
# DOCKER CLEANUP (Remove unused images, containers, and volumes)
# ============================================================================
# Remove all stopped containers
docker container prune -f

# Remove all unused images
docker image prune -a -f

# Remove all unused volumes
docker volume prune -f

# Remove all unused networks
docker network prune -f

# Complete system cleanup (use with caution)
docker system prune -a --volumes -f

# ============================================================================
# NPM CLEANUP
# ============================================================================
# Clear npm cache
npm cache clean --force

# Verify npm cache
npm cache verify

# ============================================================================
# PNPM CLEANUP (if using pnpm)
# ============================================================================
# Clear pnpm store
pnpm store prune

# ============================================================================
# YARN CLEANUP (if using yarn)
# ============================================================================
# Clear yarn cache
yarn cache clean
