const { resolveServiceForRoute } = require('./serviceRouteResolver');

const dbServices = [
  {
    id: 'd0eebc99-0001-4ef8-bb6d-6bb9bd380a02',
    name: 'Plumbing',
    slug: 'plumbing',
    sales_channel: 'residential',
  },
  {
    id: 'd0eebc99-0001-4ef8-bb6d-6bb9bd380a07',
    name: 'Eavestroughs & Gutters',
    slug: 'eavestroughs-gutters',
    sales_channel: 'residential',
  },
  {
    id: 'd0eebc99-0001-4ef8-bb6d-6bb9bd380a09',
    name: 'Decks & Fences',
    slug: 'decks-fences',
    sales_channel: 'residential',
  },
];

const mockServices = [
  { id: 2, name: 'Plumbing' },
  { id: 7, name: 'Eavestroughs' },
];

describe('resolveServiceForRoute', () => {
  test('resolves slug-style service routes to live services', () => {
    expect(resolveServiceForRoute('plumbing', dbServices, mockServices)).toBe(dbServices[0]);
  });

  test('resolves legacy mock numeric routes by close service name', () => {
    expect(resolveServiceForRoute('7', dbServices, mockServices)).toBe(dbServices[1]);
  });

  test('falls back to a real bookable service with the mock display name when no match exists', () => {
    const resolved = resolveServiceForRoute('999', dbServices, [{ id: 999, name: 'Unknown Trade' }]);

    expect(resolved).toEqual({ ...dbServices[0], _fallbackName: 'Unknown Trade' });
  });
});
