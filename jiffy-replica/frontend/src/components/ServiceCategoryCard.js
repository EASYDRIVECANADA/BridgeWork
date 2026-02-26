'use client';

import Link from 'next/link';
import { Wrench, Zap, Droplet, Wind, Leaf, Paintbrush, Hammer, Sparkles, TruckIcon, Home } from 'lucide-react';

const iconMap = {
  handyman: Wrench,
  'appliance-repair': Zap,
  plumbing: Droplet,
  electrical: Zap,
  hvac: Wind,
  'lawn-care': Leaf,
  painting: Paintbrush,
  carpentry: Hammer,
  cleaning: Sparkles,
  moving: TruckIcon,
  default: Home
};

export default function ServiceCategoryCard({ category }) {
  const IconComponent = iconMap[category.slug] || iconMap.default;

  return (
    <Link href={`/services/category/${category.slug}`}>
      <div className="card group cursor-pointer hover:shadow-large transition-all duration-300 hover:-translate-y-1 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4 group-hover:bg-primary-600 transition-colors">
          <IconComponent className="w-8 h-8 text-primary-600 group-hover:text-white transition-colors" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
        {category.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{category.description}</p>
        )}
      </div>
    </Link>
  );
}
