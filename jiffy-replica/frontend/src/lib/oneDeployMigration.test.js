const fs = require('fs');
const path = require('path');

const srcRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(srcRoot, '..');
const repoRoot = path.resolve(frontendRoot, '..');

describe('one deploy migration foundation', () => {
  test('frontend API client uses same-origin /api by default instead of Render URL env', () => {
    const source = fs.readFileSync(path.join(__dirname, 'api.js'), 'utf8');

    expect(source).toContain("const API_URL = '/api';");
    expect(source).not.toContain('NEXT_PUBLIC_API_URL');
    expect(source).not.toContain('http://localhost:5000');
  });

  test('auth provider fetches the profile through same-origin /api', () => {
    const source = fs.readFileSync(path.join(srcRoot, 'app', 'providers.js'), 'utf8');

    expect(source).toContain("axios.get('/api/auth/me'");
    expect(source).not.toContain('NEXT_PUBLIC_API_URL');
    expect(source).not.toContain('http://localhost:5000');
  });

  test('admin signup uses same-origin public invitation endpoints', () => {
    const source = fs.readFileSync(path.join(srcRoot, 'app', 'admin-signup', 'page.js'), 'utf8');

    expect(source).toContain('`/api/admin-invitations/verify/${token}`');
    expect(source).toContain("'/api/admin-invitations/accept'");
    expect(source).not.toContain('NEXT_PUBLIC_API_URL');
  });

  test('Supabase Edge bridgework-api function exists with service route handlers and legacy fallback', () => {
    const edgeSource = fs.readFileSync(
      path.join(repoRoot, 'supabase', 'functions', 'bridgework-api', 'index.ts'),
      'utf8'
    );

    expect(edgeSource).toContain('handleServicesRequest');
    expect(edgeSource).toContain('LEGACY_API_BASE_URL');
    expect(edgeSource).toContain('"/health"');
    expect(edgeSource).toContain('"/api/services"');
    expect(edgeSource).toContain('"/api/services/categories"');
  });

  test('Next API proxy keeps the previous public API env as a temporary fallback', () => {
    const proxySource = fs.readFileSync(
      path.join(srcRoot, 'app', 'api', '[...path]', 'route.js'),
      'utf8'
    );

    expect(proxySource).toContain('process.env.NEXT_PUBLIC_API_URL');
    expect(proxySource).toContain('const publicLegacyUrl = process.env.NEXT_PUBLIC_API_URL;');
  });

  test('Supabase config targets the BridgeWork production project ref', () => {
    const configSource = fs.readFileSync(path.join(repoRoot, 'supabase', 'config.toml'), 'utf8');

    expect(configSource).toContain('project_id = "ndxauksylgoxtdoxwsjk"');
    expect(configSource).toContain('[functions.bridgework-api]');
    expect(configSource).toContain('verify_jwt = false');
  });

  test('Netlify deployment docs point /api to the BridgeWork Edge API', () => {
    const deploymentDoc = fs.readFileSync(path.join(repoRoot, 'NETLIFY_DEPLOYMENT.md'), 'utf8');

    expect(deploymentDoc).toContain(
      'SUPABASE_EDGE_API_URL=https://ndxauksylgoxtdoxwsjk.functions.supabase.co/bridgework-api'
    );
    expect(deploymentDoc).not.toContain('https://YOUR_PROJECT_REF.functions.supabase.co/bridgework-api');
  });

  test('Phase 2 runbook includes deploy and live smoke commands', () => {
    const runbook = fs.readFileSync(
      path.join(repoRoot, 'docs', 'one-deploy-phase-2-services.md'),
      'utf8'
    );

    expect(runbook).toContain('npx supabase functions deploy bridgework-api --project-ref ndxauksylgoxtdoxwsjk');
    expect(runbook).toContain('SUPABASE_EDGE_API_URL=https://ndxauksylgoxtdoxwsjk.functions.supabase.co/bridgework-api');
    expect(runbook).toContain('https://bridgeworkservices.com/api/services?search=hvac&sales_channel=residential');
  });
});
