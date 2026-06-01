// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://richo.lovable.app';
const SUPABASE_URL = 'https://kcayjxyycbpnjilfgtet.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtjYXlqeHl5Y2JwbmppbGZndGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NzEyMzYsImV4cCI6MjA2NzM0NzIzNn0.mF2b-5Ab27i7Q88dN648QmqkvsF2ZN1cx-mk1oybkzc';

interface Entry {
  path: string;
  changefreq?: string;
  priority?: string;
  lastmod?: string;
}

const staticEntries: Entry[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/auth', changefreq: 'monthly', priority: '0.6' },
  { path: '/auth/client', changefreq: 'monthly', priority: '0.6' },
  { path: '/auth/expert', changefreq: 'monthly', priority: '0.6' },
  { path: '/browse-tasks', changefreq: 'daily', priority: '0.9' },
  { path: '/find-experts', changefreq: 'daily', priority: '0.9' },
  { path: '/post-task', changefreq: 'monthly', priority: '0.7' },
];

async function fetchDynamic(): Promise<Entry[]> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
    const entries: Entry[] = [];
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, updated_at')
      .in('status', ['open', 'in_progress', 'completed'])
      .limit(5000);
    for (const t of tasks ?? []) {
      entries.push({
        path: `/task/${t.id}`,
        changefreq: 'weekly',
        priority: '0.6',
        lastmod: t.updated_at ? new Date(t.updated_at).toISOString().slice(0, 10) : undefined,
      });
    }
    const { data: doers } = await supabase
      .from('users_public')
      .select('id, updated_at')
      .eq('role', 'doer')
      .limit(5000);
    for (const d of doers ?? []) {
      entries.push({
        path: `/doer/${d.id}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: d.updated_at ? new Date(d.updated_at).toISOString().slice(0, 10) : undefined,
      });
    }
    return entries;
  } catch (err) {
    console.warn('sitemap: dynamic fetch failed, continuing with static only:', err);
    return [];
  }
}

function build(entries: Entry[]) {
  const urls = entries.map((e) =>
    [
      '  <url>',
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

(async () => {
  const dynamic = await fetchDynamic();
  const all = [...staticEntries, ...dynamic];
  writeFileSync(resolve('public/sitemap.xml'), build(all));
  console.log(`sitemap.xml written (${all.length} entries)`);
})();
