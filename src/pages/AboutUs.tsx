import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const teamMembers = [
  {
    name: '김재엽',
    github: 'wera4677',
    image: '/team/member1.jpg',
  },
  {
    name: '김태영',
    github: 'taeyoung0823',
    image: '/team/member2.jpg',
  },
  {
    name: '이건호',
    github: 'hohoc99',
    image: '/team/member3.jpg',
  },
  {
    name: '전유나',
    github: 'yunajeon',
    image: '/team/member4.jpg',
  },
  {
    name: '최동욱',
    github: 'ddungddangi',
    image: '/team/member5.jpg',
  },
];

export default function AboutUs() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="pt-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div>
            <h2 className="text-primary text-base font-semibold tracking-wider uppercase">
              vision
            </h2>
            <h1 className="mt-4 text-4xl font-medium tracking-tight text-gray-900 max-w-3xl">
              "Knok은 AI 기반의 대화형 면접 시뮬레이션으로, 당신의 성공적인 취업 여정을 돕는 데 집중합니다."
            </h1>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-primary text-base font-semibold tracking-wider uppercase">
            ORGANIZATION
          </h2>

          <div className="mt-16 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-5">
            {teamMembers.map((member) => (
              <motion.div
                key={member.name}
                className="text-center"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="relative mx-auto w-48 h-48 rounded-full border-2 border-primary mb-6 overflow-hidden">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {member.name}
                </h3>
                <div className="flex items-center justify-center space-x-2">
                  <img
                    src="/github-icon.png"
                    alt="GitHub"
                    className="w-6 h-6"
                  />
                  <span className="text-xl text-gray-900">
                    {member.github}
                  </span>
                </div>
              </motion.div>
            ))}
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
                Ready for your career
              </h2>
              <div className="mt-8">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-block"
                >
                  <Link
                    to="/interview"
                    className="inline-flex items-center px-8 py-4 bg-primary text-xl font-medium rounded-md text-white hover:bg-primary/90 transition-colors"
                  >
                    Start Interview
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