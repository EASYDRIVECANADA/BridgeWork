'use client';

import { Star } from 'lucide-react';
import Image from 'next/image';

export default function TestimonialCard({ testimonial }) {
  return (
    <div className="card bg-white">
      <div className="flex items-center gap-4 mb-4">
        <Image
          src={testimonial.avatar}
          alt={testimonial.name}
          width={60}
          height={60}
          className="rounded-full"
        />
        <div>
          <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
          <div className="flex gap-1">
            {[...Array(testimonial.rating)].map((_, i) => (
              <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            ))}
          </div>
        </div>
      </div>
      <p className="text-gray-700 mb-3">{testimonial.comment}</p>
      <p className="text-sm text-primary-600 font-medium">{testimonial.service}</p>
    </div>
  );
}
