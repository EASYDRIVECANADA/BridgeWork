'use client';

import { useState } from 'react';
import { Search, User, FileText, Clipboard, Award, Key, Edit, Calendar, CheckCircle, HelpCircle, MessageSquare, File } from 'lucide-react';
import Link from 'next/link';

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const articles = [
    {
      id: 1,
      icon: <HelpCircle className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'General Information',
      description: 'About BridgeWork and our Professionals. Learn about our 100% Satisfaction guaranteed for each job and how t...',
      author: 'by Nicole',
      articleCount: '6 articles',
    },
    {
      id: 2,
      icon: <Clipboard className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'BridgeWork Service areas',
      description: 'Toronto, Calgary, Montreal, Ottawa, Vancouver, Edmonton, Chicago & Boston',
      author: 'by Nicole',
      articleCount: '1 articles',
    },
    {
      id: 3,
      icon: <FileText className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'Service with type of job category offered to see which one is right for your request',
      description: '',
      author: 'by Nicole',
      articleCount: '20 articles',
    },
    {
      id: 4,
      icon: <Award className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'Memberships',
      description: 'Learn more about our BridgeWork+ and BridgeWork Spending Account (USA) Memberships.',
      author: 'by Nicole',
      articleCount: '24 articles',
    },
    {
      id: 5,
      icon: <Key className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'Before booking',
      description: 'Signing up, how to book, prices & rates, method of payment (adding a credit card) and requesting a...',
      author: 'by Nicole',
      articleCount: '19 articles',
    },
    {
      id: 6,
      icon: <Edit className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'Your Profile',
      description: '',
      author: 'by Nicole',
      articleCount: '3 articles',
    },
    {
      id: 7,
      icon: <FileText className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'Requested Job',
      description: '',
      author: 'by Nicole',
      articleCount: '4 articles',
    },
    {
      id: 8,
      icon: <Calendar className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'Accepted Jobs',
      description: '',
      author: 'by Nicole',
      articleCount: '5 articles',
    },
    {
      id: 9,
      icon: <CheckCircle className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'Completed Job',
      description: '',
      author: 'by Nicole',
      articleCount: '4 articles',
    },
    {
      id: 10,
      icon: <HelpCircle className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'BridgeWork Jobs',
      description: 'Satisfaction Guarantee, Terms and Conditions, Privacy Policy',
      author: 'by Nicole',
      articleCount: '7 articles',
    },
    {
      id: 11,
      icon: <MessageSquare className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'Compliments & Complaints',
      description: 'We want to hear from your about your Job experience!',
      author: 'by Nicole',
      articleCount: '2 articles',
    },
    {
      id: 12,
      icon: <File className="w-6 h-6 text-[#2D7FE6]" />,
      title: 'FAQs',
      description: 'Quickly find the answers you need.',
      author: 'by Nicole',
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
      <div className="bg-[#2D7FE6] text-white py-12">
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
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-[#2D7FE6] transition-all group"
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#2D7FE6] transition-colors">
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
            <Link href="/contact" className="text-[#2D7FE6] hover:underline">
              Click here to contact us
            </Link>
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#2D7FE6] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-[#2D7FE6] transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </a>
          </div>
          <p className="text-gray-400 text-xs mt-6">We run on Intercom</p>
        </div>
      </div>
    </div>
  );
}
