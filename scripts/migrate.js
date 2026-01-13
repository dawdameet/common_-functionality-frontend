const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
    const connectionString = process.env.DATABASE_URL || process.argv[2];

    if (!connectionString) {
        console.error('Error: DATABASE_URL environment variable or argument is missing.');
        console.log('Usage: DATABASE_URL=... node scripts/migrate.js');
        process.exit(1);
    }

    // Handle [YOUR-PASSWORD] placeholder if user forgot to replace it
    if (connectionString.includes('[YOUR-PASSWORD]')) {
        console.error('Error: specific password placeholder [YOUR-PASSWORD] found in connection string. Please replace it with your actual password.');
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Supabase requires SSL
    });

    try {
        console.log('Connecting to database...');
        await client.connect();

        // Get file from args or default
        // Filter out the connection string if it was passed as process.argv[2]
        const validArgs = process.argv.slice(2).filter(arg => !arg.startsWith('postgresql://') && !arg.startsWith('postgres://'));
        const sqlFile = validArgs[0] || path.join(__dirname, '..', 'supabase', 'schema.sql');

        console.log(`Reading schema from ${sqlFile}...`);
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('Applying migration...');
        await client.query(sql);

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
