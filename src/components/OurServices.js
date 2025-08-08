import Image from 'next/image';
import Link from 'next/link';

const services = [
  {
    title: 'Social',
    imageUrl: '/images/services/social-media.jpg',
    href: '/billboards?categoryId=social-media'
  },
  {
    title: 'Unipole Advertising',
    imageUrl: '/images/services/billboard.jpg',
    href: '/billboards?categoryId=unipole'
  },
  {
    title: 'Digital LED display ads',
    imageUrl: '/images/services/digital-ads.jpg',
    href: '/billboards?categoryId=digital-advertising'
  }
];

export default function OurServices() {
  return (
    <section className="bg-gray-100 dark:bg-gray-900 py-12 sm:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8 lg:mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
            Our Services
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-base text-gray-600 dark:text-gray-400">
            Discover our comprehensive advertising solutions designed to elevate your brand and drive measurable results.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {services.map((service) => (
            <Link key={service.title} href={service.href} className="block group">
              <div className="relative aspect-[6.5/6] sm:aspect-[4/5] w-full overflow-hidden rounded-xl sm:rounded-2xl shadow-lg dark:shadow-gray-900/50">
                {/* Background Image */}
                <Image
                  src={service.imageUrl}
                  alt={service.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
                />

                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent dark:from-black/90 dark:via-black/50"></div>

                {/* Content */}
                <div className="absolute inset-0 p-4 sm:p-5 flex flex-col">
                  {/* Top Tag (if you add tags back) */}
                  {service.tag && (
                    <div className="self-start">
                      <span className="bg-white/90 dark:bg-gray-200/90 backdrop-blur-sm text-gray-900 dark:text-gray-800 text-xs font-semibold px-2 sm:px-3 py-1 rounded-full">
                        {service.tag}
                      </span>
                    </div>
                  )}

                  {/* Bottom Text */}
                  <div className="mt-auto">
                    <h3 className="text-lg sm:text-xl font-bold text-white">
                      {service.title}
                    </h3>
                    <p className="mt-1 text-white font-semibold flex items-center transition-all duration-300 group-hover:text-gray-200 text-sm sm:text-base">
                      View Options
                      <svg
                        className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-300 group-hover:translate-x-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
