// React application shell rendering the complete 15-day travel guide.
import { LightboxProvider } from "./components/Lightbox";
import { Topbar } from "./guide/Topbar";
import { Hero } from "./guide/Hero";
import { Filmstrip } from "./guide/Filmstrip";
import { RouteSection } from "./guide/RouteSection";
import { Days } from "./guide/Days";
import { Places } from "./guide/Places";
import { Food } from "./guide/Food";
import { Plan } from "./guide/Plan";
import { Footer } from "./guide/Footer";
import { usePlaceSelection } from "./guide/usePlaceSelection";

export default function App() {
  const { place, lens, select } = usePlaceSelection();

  return (
    <LightboxProvider>
      <Topbar />
      <Hero />
      <Filmstrip />
      <main id="main">
        <RouteSection onSelectPlace={(id) => select(id, { scroll: true })} />
        <Days onOpenGuide={(id) => select(id, { scroll: true })} />
        <Places place={place} lens={lens} onSelect={select} />
        <Food />
        <Plan />
      </main>
      <Footer />
    </LightboxProvider>
  );
}
