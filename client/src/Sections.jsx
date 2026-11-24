import { Hero, Finder, Categories, Interior, GpsBanner } from './sections/Story.jsx';
import { Trending, Stats, Reviews, Services, Brands, Footer } from './sections/Shop.jsx';

// Order is deliberate (attention -> intent -> desire -> proof -> reassurance):
//  Hero (hook) -> Find your fit (capture intent) -> Categories -> Interior (wow moment) ->
//  Smart GPS offer -> Trending products -> Stats -> Testimonials (proof right after the
//  products) -> Services -> Brands -> Footer. The first six sections drive the 3D car.
export default function Sections() {
  return (
    <>
      <Hero />
      <Finder />
      <Categories />
      <Interior />
      <GpsBanner />
      <Trending />
      <Stats />
      <Reviews />
      <Services />
      <Brands />
      <Footer />
    </>
  );
}
