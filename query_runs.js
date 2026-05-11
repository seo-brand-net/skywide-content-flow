const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://obswcosfipqjvklqlnrj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ic3djb3NmaXBxanZrbHFsbnJqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg2NjI1OSwiZXhwIjoyMDgwNDQyMjU5fQ.3mRimqfkuFrcBZoFaY9xHHEaIBo7IH_nyP1mqfNMtPQ'
);

async function main() {
  const { data, error } = await supabase
    .from('content_requests')
    .select('id, user_id, article_title, client_name, created_at, creative_brief, word_count, article_type, primary_keywords')
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) { console.log('Error:', error.message); return; }

  const byUser = {};
  data.forEach(r => {
    if (!byUser[r.user_id]) byUser[r.user_id] = [];
    byUser[r.user_id].push(r);
  });

  for (const [uid, runs] of Object.entries(byUser)) {
    console.log(`\n====== USER: ${uid} ======`);
    runs.slice(0, 8).forEach((r, i) => {
      console.log(`  [${i+1}] ${r.created_at?.split('T')[0]} | ${r.article_title} | client: ${r.client_name} | id: ${r.id}`);
    });
  }
}

main().catch(console.error);
