'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function CpanelImagePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            cPanel DNS Configuration
          </h1>
          
          <div className="relative w-full">
            <Image
              src="https://app-cdn.appgen.com/f81ce8c5-5bb9-49c7-b043-fd6438f7bc50/assets/uploaded_1772017942724_ep8ojj.png"
              alt="cPanel DNS Zone Editor"
              width={1200}
              height={800}
              className="w-full h-auto rounded-lg border border-gray-200"
              priority
            />
          </div>
          
          <div className="mt-6 text-gray-600">
            <p>DNS configuration for christfaculty.org domain</p>
          </div>
        </div>
      </div>
    </div>
  );
}
