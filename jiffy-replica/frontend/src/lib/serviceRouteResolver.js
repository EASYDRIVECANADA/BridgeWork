function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findByServiceIdentity(routeValue, services) {
  const normalizedRoute = normalize(routeValue);
  if (!normalizedRoute) return null;

  return services.find((service) => {
    const candidates = [service.id, service.slug, service.name].map(normalize);
    return candidates.includes(normalizedRoute);
  }) || null;
}

function findByServiceName(name, services) {
  const normalizedName = normalize(name);
  if (!normalizedName) return null;

  return services.find((service) => normalize(service.name) === normalizedName)
    || services.find((service) => {
      const serviceName = normalize(service.name);
      return serviceName.includes(normalizedName) || normalizedName.includes(serviceName);
    })
    || null;
}

function resolveServiceForRoute(routeValue, dbServices = [], mockServices = []) {
  const services = Array.isArray(dbServices) ? dbServices : [];
  if (services.length === 0) return null;

  const directMatch = findByServiceIdentity(routeValue, services);
  if (directMatch) return directMatch;

  const numericId = Number.parseInt(routeValue, 10);
  const mockService = Number.isNaN(numericId)
    ? null
    : mockServices.find((service) => service.id === numericId);

  if (!mockService) return null;

  const matchedByMockName = findByServiceName(mockService.name, services);
  if (matchedByMockName) return matchedByMockName;

  return { ...services[0], _fallbackName: mockService.name };
}

module.exports = {
  resolveServiceForRoute,
};
