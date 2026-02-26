'use client';

import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search } from 'lucide-react';
import { searchServices, clearSearchResults } from '@/store/slices/servicesSlice';

export default function ServiceSearchBar({ onSearch, placeholder = "What do you need help with?" }) {
  const dispatch = useDispatch();
  const { searchResults, isLoading } = useSelector((state) => state.services);
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        dispatch(searchServices(query));
        setShowResults(true);
      } else {
        dispatch(clearSearchResults());
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
      setShowResults(false);
    }
  };

  const handleResultClick = (service) => {
    setQuery(service.name);
    onSearch(service.name);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-6 py-4 pr-14 rounded-full border-2 border-transparent bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>

      {showResults && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
          {searchResults.map((service) => (
            <button
              key={service.id}
              onClick={() => handleResultClick(service)}
              className="w-full px-6 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{service.name}</div>
              {service.short_description && (
                <div className="text-sm text-gray-600 mt-1">{service.short_description}</div>
              )}
              {service.base_price && (
                <div className="text-sm text-primary-600 font-semibold mt-1">
                  Starting at ${service.base_price}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {showResults && query.trim().length >= 2 && searchResults.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <p className="text-gray-600 text-center">No services found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
