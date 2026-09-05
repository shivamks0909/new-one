import { db } from './src/db/index';

async function wipeDatabase() {
  console.log('[DB] Connecting to PostgreSQL to wipe all data...');
  try {
    // Get all tables in the public schema
    const { rows } = await db.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `);
    
    const tables = rows.map(r => r.table_name).filter(t => t !== 'schema_migrations'); // Keep migrations if any
    
    if (tables.length === 0) {
      console.log('No tables found in public schema.');
      process.exit(0);
    }
    
    console.log(`Found ${tables.length} tables to truncate...`);
    const tablesList = tables.map(t => `"${t}"`).join(', ');
    
    console.log('Executing TRUNCATE CASCADE...');
    await db.pool.query(`TRUNCATE TABLE ${tablesList} CASCADE;`);
    
    console.log('✅ All data wiped successfully.');
  } catch (error) {
    console.error('❌ Error wiping data:', error);
  } finally {
    process.exit(0);
  }
}

wipeDatabase();
