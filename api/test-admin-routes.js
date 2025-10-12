// Quick test to see if admin routes register
const { createApp } = require('./api/dist/index.js');

(async () => {
  try {
    const app = await createApp();
    const routes = app.printRoutes();
    console.log('=== Registered Routes ===');
    console.log(routes);
    
    // Check for admin routes
    const hasAdminUsers = routes.includes('/api/admin/users');
    const hasAdminOrg = routes.includes('/api/admin/organization');
    
    console.log('\n=== Admin Routes Check ===');
    console.log('Has /api/admin/users:', hasAdminUsers);
    console.log('Has /api/admin/organization:', hasAdminOrg);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
