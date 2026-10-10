import { initDb, upsertDbBrand, upsertDbBrandAffinities, upsertDbProduct, pool, checkDbHealth } from '../src/server/db';
import { BRANDS } from '../src/data/brands';
import { PRODUCTS } from '../src/data/products';

async function seed() {
  console.log('--- THREAD Database Seeder ---');
  console.log('Connecting to PostgreSQL and initializing schema...');
  await initDb();

  console.log(`\n1. Seeding ${BRANDS.length} curated brands...`);
  for (const brand of BRANDS) {
    await upsertDbBrand(brand);
    process.stdout.write(`  ✓ Seeded brand entity: ${brand.name} (${brand.id})\n`);
  }

  console.log(`\n2. Linking brand affinity relationships...`);
  for (const brand of BRANDS) {
    await upsertDbBrandAffinities(brand);
  }
  console.log(`  ✓ Brand affinity graph linked.`);

  console.log(`\n3. Seeding ${PRODUCTS.length} curated garments from mock catalog...`);
  for (const product of PRODUCTS) {
    await upsertDbProduct(product);
    process.stdout.write(`  ✓ Seeded product: ${product.name} [${product.brand}]\n`);
  }

  const health = await checkDbHealth();
  console.log('\n--- Seeding Complete ---');
  console.log(`PostgreSQL Status: Connected=${health.connected}`);
  console.log(`Total Brands in Database: ${health.brandCount}`);
  console.log(`Total Products in Database: ${health.productCount}`);

  await pool.end();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
