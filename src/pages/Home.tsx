import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const features = [
  {
    title: 'Goal-Based Practice',
    description: '원하는 기업과 직무를 목표로 설정하고, AI가 맞춤형 면접 훈련을 제공합니다. KONK는 단순한 연습을 넘어, 취업이라는 목표 달성을 위한 전략적 준비를 돕습니다.',
  },
  {
    title: 'Rapid Skill Boost',
    description: '단 몇 번의 연습만으로도 확실한 변화를 느껴보세요. AI 분석 기반의 집중 피드백으로 면접 실력이 빠르게 향상됩니다.',
  },
  {
    title: 'Structured Answer Design',
    description: 'AI가 논리 흐름, 일관된 답변, 키워드 연결, 핵심 전달력을 분석해 더 설득력 있는 응답 플로우로 다듬어드립니다. 논리적이고 일관된 답변 흐름으로 면접관을 사로잡으세요.',
  },
];

const testimonials = [
  {
    content: 'Waves demonstrates an excellent understanding of user needs and all of their designs are creative and elegant in their simplicity.',
    author: 'Jerome Bell',
    role: 'President of Sales',
    company: 'Binford Ltd.',
  },
  {
    content: 'The quality of their work stands out the most. Theyre knowledgeable and provide useful feedback.',
    author: 'Leslie Alexander',
    role: 'CEO',
    company: 'Big Kahuna Burger Ltd.',
  },
  {
    content: 'With a broad understanding of both the product and current technologies, they provide impactful, timely, and flexible support.',
    author: 'Marielle Wigington',
    role: 'Marketing Director',
    company: 'Rose Microsystems',
  },
];

const news = [
  {
    category: 'Business',
    date: 'April 25, 2022',
    title: 'Twitter board meets Musk to discuss bid - Reports',
    image: '/news1.jpg',
  },
  {
    category: 'Technology',
    date: 'June 10, 2022',
    title: 'Actors launch campaign against AI \'show stealers',
    image: '/news2.jpg',
  },
  {
    category: 'Science',
    date: 'May 10, 2022',
    title: 'OneWeb: UK satellite firm does deal to use Indian rockets',
    image: '/news3.jpg',
  },
];

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="pt-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h2 className="text-primary text-base font-semibold tracking-wider uppercase">
              OUR SERVICES
            </h2>
            <h1 className="mt-4 text-4xl font-medium tracking-tight text-gray-900 sm:text-5xl">
              똑똑..<br />
              당신의 취업문을 두드리는 "노크"
            </h1>
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-primary text-base font-semibold tracking-wider uppercase">
              OUR SERVICES
            </h2>
            <p className="mt-4 text-4xl font-medium tracking-tight text-gray-900">
              KONK delivers<br />
              personalized AI-powered interview solutions<br />
              for job seekers
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-16 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <h3 className="text-3xl font-medium text-primary">{feature.title}</h3>
                <p className="mt-4 text-base text-gray-700">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block"
            >
              <Link
                to="/interview"
                className="inline-flex items-center px-8 py-3 border border-primary text-base font-medium rounded-md text-primary hover:bg-primary hover:text-white transition-colors"
              >
                Start KNOK
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-medium text-gray-900">
            What our great customers say
          </h2>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-secondary/[.85] p-8 rounded-lg"
                style={{
                  opacity: 1 - index * 0.3,
                }}
              >
                <p className="text-2xl font-medium text-gray-900">
                  {testimonial.content}
                </p>
                <div className="mt-8">
                  <p className="text-base font-medium text-primary">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-gray-900">
                    {testimonial.role} ({testimonial.company})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-medium text-gray-900">
            News & Insights
          </h2>

          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {news.map((item) => (
              <div key={item.title} className="flex flex-col">
                <div className="aspect-w-16 aspect-h-9 bg-gray-300 rounded-lg overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-6">
                  <div className="flex items-center space-x-4">
                    <span className="text-primary">{item.category}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-primary">{item.date}</span>
                  </div>
                  <h3 className="mt-4 text-2xl font-medium text-gray-900">
                    {item.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-block"
            >
              <Link
                to="/news"
                className="inline-flex items-center px-8 py-3 border border-primary text-base font-medium rounded-md text-primary hover:bg-primary hover:text-white transition-colors"
              >
                Explore all news
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-[url('/cta-bg.jpg')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative py-24 px-8 text-center">
              <h2 className="text-5xl font-medium text-white">
                Ready for your project
              </h2>
              <div className="mt-8">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-block"
                >
                  <Link
                    to="/contact"
                    className="inline-flex items-center px-8 py-4 bg-primary text-xl font-medium rounded-md text-white hover:bg-primary/90 transition-colors"
                  >
                    Get in touch
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 