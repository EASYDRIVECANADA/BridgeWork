'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function ServicesPage() {
  const [selectedCategory, setSelectedCategory] = useState('Cleaning');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'cleaning', name: 'Cleaning', icon: '🧹' },
    { id: 'indoors', name: 'Indoors', icon: '🏠' },
    { id: 'install', name: 'Install', icon: '🔧' },
    { id: 'bridgework-shop', name: 'BridgeWork Shop', icon: '🛒' },
    { id: 'outdoors', name: 'Outdoors', icon: '🌳' },
    { id: 'repair', name: 'Repair', icon: '🔨' },
    { id: 'seasonal', name: 'Seasonal', icon: '❄️' },
  ];

  const services = {
    Cleaning: [
      { id: 1, name: 'BBQ Cleaning & Repair', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=400' },
      { id: 2, name: 'Carpet & Upholstery Cleaning', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=400' },
      { id: 3, name: 'Dryer Vent Cleaning', image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?q=80&w=400' },
      { id: 4, name: 'Duct Cleaning', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400' },
      { id: 5, name: 'Junk Removal', image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=400' },
      { id: 6, name: 'Mold Remediation', image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?q=80&w=400' },
      { id: 7, name: 'Powerwash, Stain & Seal', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400' },
      { id: 8, name: 'Tile & Grout Cleaning', image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?q=80&w=400' },
    ],
    Indoors: [
      { id: 9, name: 'Appliance Repair', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=400' },
      { id: 10, name: 'Drywall Repair', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400' },
      { id: 11, name: 'Flooring', image: 'https://images.unsplash.com/photo-1615875474908-f403116f5287?q=80&w=400' },
      { id: 12, name: 'Interior Painting', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=400' },
      { id: 13, name: 'Plumbing', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400' },
      { id: 14, name: 'Tile Installation', image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?q=80&w=400' },
    ],
    Install: [
      { id: 15, name: 'Appliance Install', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=400' },
      { id: 16, name: 'Electrical', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=400' },
      { id: 17, name: 'Flooring', image: 'https://images.unsplash.com/photo-1615875474908-f403116f5287?q=80&w=400' },
      { id: 18, name: 'Furniture Assembly', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=400' },
      { id: 19, name: 'Gas Services', image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400' },
      { id: 20, name: 'Handyman Services', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400' },
      { id: 21, name: 'Heating & Cooling', image: 'https://images.unsplash.com/photo-1635274531661-1c5a5e9b0d3d?q=80&w=400' },
      { id: 22, name: 'Locksmith', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=400' },
      { id: 23, name: 'Plumbing', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400' },
    ],
    'BridgeWork Shop': [
      { id: 24, name: 'Home Essentials', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=400' },
      { id: 25, name: 'Tools & Equipment', image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400' },
      { id: 26, name: 'Smart Home Devices', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=400' },
    ],
    Outdoors: [
      { id: 27, name: 'Deck & Fence Repair', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400' },
      { id: 28, name: 'Exterior Painting', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400' },
      { id: 29, name: 'Gutter Cleaning', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400' },
      { id: 30, name: 'Landscaping', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400' },
      { id: 31, name: 'Lawn Mowing', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400' },
      { id: 32, name: 'Pressure Washing', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400' },
    ],
    Repair: [
      { id: 33, name: 'Appliance Repair', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=400' },
      { id: 34, name: 'Drywall Repair', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400' },
      { id: 35, name: 'Electrical Repair', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=400' },
      { id: 36, name: 'Plumbing Repair', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400' },
      { id: 37, name: 'Roof Repair', image: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?q=80&w=400' },
    ],
    Seasonal: [
      { id: 38, name: 'Snow Removal', image: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?q=80&w=400' },
      { id: 39, name: 'Holiday Decorating', image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?q=80&w=400' },
      { id: 40, name: 'Spring Cleaning', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400' },
      { id: 41, name: 'Winterization', image: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?q=80&w=400' },
    ],
  };

  const filteredServices = services[selectedCategory] || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-blue-50 to-blue-100 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            BridgeWork keeps your home in great shape, inside and out.
          </h1>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6" />
              <input
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-4 py-4 text-lg border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-[#2D7FE6] transition-colors"
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-6 py-3 rounded-full font-medium transition-all ${
                  selectedCategory === category.name
                    ? 'bg-black text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>

          {/* Help Text */}
          <p className="text-sm text-gray-600">
            Need help finding the right service?{' '}
            <Link href="/chat" className="text-[#2D7FE6] underline hover:text-[#2570d4]">
              Chat with us.
            </Link>
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.id}`}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden group cursor-pointer"
            >
              <div className="flex items-center gap-4 p-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <Image
                    src={service.image}
                    alt={service.name}
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
                <h3 className="text-lg font-medium text-gray-900 group-hover:text-[#2D7FE6] transition-colors">
                  {service.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No services found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
