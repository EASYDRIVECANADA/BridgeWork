'use client';

import { useState } from 'react';
import { Search, User, FileText, Clipboard, Award, Key, Edit, Calendar, CheckCircle, HelpCircle, MessageSquare, File } from 'lucide-react';
import Link from 'next/link';

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const articles = [
    {
      id: 1,
      icon: <HelpCircle className="w-6 h-6 text-[#0E7480]" />,
      title: 'General Information',
      description: 'About BridgeWork and our Professionals. Learn about our 100% Satisfaction guaranteed for each job and how t...',
      author: 'BridgeWork Team',
      articleCount: '6 articles',
    },
    {
      id: 2,
      icon: <Clipboard className="w-6 h-6 text-[#0E7480]" />,
      title: 'BridgeWork Service areas',
      description: 'Serving homeowners across Ontario, Canada',

      author: 'BridgeWork Team',
      articleCount: '1 articles',
    },
    {
      id: 3,
      icon: <FileText className="w-6 h-6 text-[#0E7480]" />,
      title: 'Service with type of job category offered to see which one is right for your request',
      description: '',
      author: 'BridgeWork Team',
      articleCount: '20 articles',
    },
    {
      id: 4,
      icon: <Award className="w-6 h-6 text-[#0E7480]" />,
      title: 'Memberships',
      description: 'Learn more about our BridgeWork+ Memberships.',
      author: 'BridgeWork Team',
      articleCount: '24 articles',
    },
    {
      id: 5,
      icon: <Key className="w-6 h-6 text-[#0E7480]" />,
      title: 'Before booking',
      description: 'Signing up, how to book, prices & rates, method of payment (adding a credit card) and requesting a...',
      author: 'BridgeWork Team',
      articleCount: '19 articles',
    },
    {
      id: 6,
      icon: <Edit className="w-6 h-6 text-[#0E7480]" />,
      title: 'Your Profile',
      description: '',
      author: 'BridgeWork Team',
      articleCount: '3 articles',
    },
    {
      id: 7,
      icon: <FileText className="w-6 h-6 text-[#0E7480]" />,
      title: 'Requested Job',
      description: '',
      author: 'BridgeWork Team',
      articleCount: '4 articles',
    },
    {
      id: 8,
      icon: <Calendar className="w-6 h-6 text-[#0E7480]" />,
      title: 'Accepted Jobs',
      description: '',
      author: 'BridgeWork Team',
      articleCount: '5 articles',
    },
    {
      id: 9,
      icon: <CheckCircle className="w-6 h-6 text-[#0E7480]" />,
      title: 'Completed Job',
      description: '',
      author: 'BridgeWork Team',
      articleCount: '4 articles',
    },
    {
      id: 10,
      icon: <HelpCircle className="w-6 h-6 text-[#0E7480]" />,
      title: 'BridgeWork Jobs',
      description: 'Satisfaction Guarantee, Terms and Conditions, Privacy Policy',
      author: 'BridgeWork Team',
      articleCount: '7 articles',
    },
    {
      id: 11,
      icon: <MessageSquare className="w-6 h-6 text-[#0E7480]" />,
      title: 'Compliments & Complaints',
      description: 'We want to hear from your about your Job experience!',
      author: 'BridgeWork Team',
      articleCount: '2 articles',
    },
    {
      id: 12,
      icon: <File className="w-6 h-6 text-[#0E7480]" />,
      title: 'FAQs',
      description: 'Quickly find the answers you need.',
      author: 'BridgeWork Team',
      articleCount: '18 articles',
    },
  ];

  const filteredArticles = articles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="bg-[#0E7480] text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Top Bar - Title and Language */}
          <div className="flex items-center justify-between mb-12">
            <span className="text-sm font-medium">BridgeWork Help Center</span>
            <button className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
              </svg>
              English
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Main Heading */}
          <h1 className="text-3xl md:text-4xl font-bold mb-8">
            Advice and answers from the BridgeWork Team
          </h1>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
            />
          </div>
        </div>
      </div>

      {/* Articles List */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <Link
              key={article.id}
              href={`/help/${article.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-[#0E7480] transition-all group"
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    {article.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#0E7480] transition-colors">
                    {article.title}
                  </h3>
                  {article.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {article.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{article.author}</span>
                    </div>
                    <span>•</span>
                    <span>{article.articleCount}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredArticles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No articles found matching your search.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h3 className="text-gray-400 text-sm font-medium mb-4">BridgeWork Help Center</h3>
          <p className="text-gray-500 text-sm mb-6">
            Don't see your answer?{' '}
            <Link href="/contact" className="text-[#0E7480] hover:underline">
              Click here to contact us
            </Link>
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://www.facebook.com/bridgeworkservices"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#0E7480] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/bridgeworkservices"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#0E7480] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
