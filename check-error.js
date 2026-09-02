const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://braradlnsueprzylilyy.supabase.co',
  'sb_publishable_ZPcd-6JtdEjQzmZaHZjfyQ_XurOgQ4b' // anon key
);

async function main() {
  console.log('Querying profiles...');
  const { data, error } = await supabase.from('profiles').select('*');
  console.log('Data:', data);
  console.log('Error:', error);
}

main();
